import { CircularQueue, Stack, LinkedList, MaxHeap, BinarySearchTree, BTree, bfs } from '../dsa/structures.js';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, TOWER_TYPES, ENEMY_TYPES, createUpgradeTrees, createBattlefield, generateWave } from './config.js';
import { validateSave, validHistoryRecord } from './save-validation.js';
export { DIFFICULTIES, DEFAULT_DIFFICULTY, TOWER_TYPES, ENEMY_TYPES } from './config.js';

const STEP = 1 / 60, SAVE_KEY = 'sylva-game-v1', HISTORY_KEY = 'sylva-wave-history-v1';
const copy = value => JSON.parse(JSON.stringify(value));
const success = message => ({ ok: true, message });
const failure = message => ({ ok: false, message });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Rendering calls update(realDeltaSeconds). The engine owns fixed 60 Hz stepping. */
export class GameEngine {
  constructor(options = {}) {
    try { this.storage = Object.hasOwn(options, 'storage') ? options.storage : (typeof localStorage !== 'undefined' ? localStorage : null); } catch { this.storage = null; }
    this.upgradeTrees = createUpgradeTrees(); this.history = new BTree(2); this.recordId = 0; this.runId = 0;
    try { const records = JSON.parse(this.storage?.getItem(HISTORY_KEY) || '[]'); if (Array.isArray(records)) for (const record of records) if (validHistoryRecord(record)) { this.history.insert(record.id, record); this.recordId = Math.max(this.recordId, record.id); this.runId = Math.max(this.runId, record.run); } } catch { /* Private-mode storage must not prevent playing. */ }
    this.restart();
  }
  restart() {
    this.difficulty = Number.isInteger(this.difficulty) && Object.hasOwn(DIFFICULTIES, this.difficulty) ? this.difficulty : DEFAULT_DIFFICULTY;
    this.grid = createBattlefield(); this.bfsResult = bfs(this.grid, { col: 0, row: 5 }, { col: 16, row: 6 });
    this.path = this.bfsResult.path.map(p => ({ ...p, x: p.col - 8, z: p.row - 6 }));
    this.health = 100; this.coins = 200; this.wave = 1; this.phase = 'ready'; this.paused = false; this.speed = 1;
    this.towers = []; this.enemies = []; this.projectiles = new LinkedList(); this.enemyTree = new BinarySearchTree();
    this.spawnQueue = new CircularQueue(128); this.undoStack = new Stack(); this.redoStack = new Stack(); this.targetHeap = new MaxHeap();
    this.selectedTowerId = null; this.effects = []; this.operations = []; this.nextId = 1; this.time = 0; this.accumulator = 0; this.spawnClock = 0; this.seed = 2764293; this.runId++;
    this.waveStats = { kills: 0, leaked: 0, damage: 0, coins: 0, started: 0 }; this.waveTotal = 0; this.totalKills = 0; this.lastTargetId = null; this.heapTowerId = null;
    this.log('BFS', 'find shortest route', 'O(V + E)', 'A circular queue explores orthogonal path cells and stores predecessors.', this.bfsResult.order.map(p => `${p.col},${p.row}`));
    return success('A new grove awaits.');
  }
  random() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  log(structure, operation, complexity, explanation, nodes = []) {
    this.operations.push({ structure, operation, complexity, explanation, nodes, time: this.time });
    // Each inspector tab keeps its own recent evidence; firing must not erase a completed BFS or queue operation.
    let count = 0;
    for (let index = this.operations.length - 1; index >= 0; index--) {
      if (this.operations[index].structure === structure && ++count > 12) { this.operations.splice(index, 1); break; }
    }
  }
  emit(type, data = {}) { this.effects.push({ ...data, entityType: data.type, type, time: this.time }); if (this.effects.length > 500) this.effects.shift(); }
  drainEffects() { const events = this.effects; this.effects = []; return events; }
  getTower(id = this.selectedTowerId) { return this.towers.find(tower => tower.id === id); }
  selectTower(id) { this.selectedTowerId = this.getTower(id) ? id : null; return success('Selection updated.'); }
  canPlace(type, col, row) { return Boolean(Object.hasOwn(TOWER_TYPES, type) && Number.isInteger(col) && Number.isInteger(row) && this.grid[row]?.[col] === 'build' && this.coins >= TOWER_TYPES[type].cost && !['victory', 'defeat'].includes(this.phase)); }
  towerSnapshot(tower) { if (!tower) return null; const { cooldown, firedAt, targetId, ...decision } = tower; return copy(decision); }
  towerRuntime(tower) { return { cooldownReadyAt: this.time + Math.max(0, tower.cooldown), mode: tower.mode, ...(tower.firedAt === undefined ? {} : { firedAt: tower.firedAt }), ...(tower.targetId === undefined ? {} : { targetId: tower.targetId }) }; }
  recordAction(action) { this.undoStack.push(action); this.redoStack.clear(); this.log('Stack', 'push player decision', 'O(1)', 'Undo stores tower snapshots and a coin delta; enemy simulation remains independent.', [action.kind, action.id]); }
  place(type, col, row) {
    if (this.phase === 'victory' || this.phase === 'defeat') return failure('Restart to plant a new defense.');
    if (!Object.hasOwn(TOWER_TYPES, type)) return failure('Choose a tower first.'); const definition = TOWER_TYPES[type];
    if (!Number.isInteger(col) || !Number.isInteger(row) || this.grid[row]?.[col] !== 'build') return failure('Plant on an open forest tile, away from the path and rocks.');
    if (this.coins < definition.cost) return failure(`You need ${definition.cost} seeds to grow ${definition.name}.`);
    const tower = { id: this.nextId++, type, col, row, x: col - 8, z: row - 6, level: 1, stats: { damage: definition.damage, range: definition.range, interval: definition.interval, multishot: 1, chain: 3 }, mode: 'first', upgradeNode: 'root', invested: definition.cost, cooldown: 0.15, plantedAt: this.time };
    this.towers.push(tower); this.grid[row][col] = 'tower'; this.coins -= definition.cost; this.selectedTowerId = tower.id;
    this.recordAction({ kind: 'place', id: tower.id, before: null, after: this.towerSnapshot(tower), coinDelta: -definition.cost });
    this.emit('placement', { ...tower }); return success(`${definition.name} takes root.`);
  }
  getUpgradeOptions(id = this.selectedTowerId) { const tower = this.getTower(id); return tower ? this.upgradeTrees[tower.type].children(tower.upgradeNode) : []; }
  upgrade(id, branch) {
    const tower = this.getTower(id); if (!tower) return failure('Select a tower to nurture.');
    const choices = this.getUpgradeOptions(id); const upgrade = choices.find((node, i) => node.id === branch || (branch === 'left' && i === 0) || (branch === 'right' && i === 1) || branch === i);
    if (!upgrade) return failure('This upgrade branch is not available.'); if (this.coins < upgrade.cost) return failure(`This growth needs ${upgrade.cost} seeds.`);
    const before = this.towerSnapshot(tower), modifiers = upgrade.modifiers;
    if (modifiers.damage) tower.stats.damage *= modifiers.damage; if (modifiers.interval) tower.stats.interval *= modifiers.interval; if (modifiers.range) tower.stats.range += modifiers.range; if (modifiers.multishot) tower.stats.multishot = modifiers.multishot; if (modifiers.chain) tower.stats.chain = modifiers.chain;
    tower.upgradeNode = upgrade.id; tower.level++; tower.invested += upgrade.cost; this.coins -= upgrade.cost;
    this.recordAction({ kind: 'upgrade', id, before, after: this.towerSnapshot(tower), coinDelta: -upgrade.cost });
    this.log('Binary tree', 'choose upgrade branch', 'O(u) node lookup', 'Depth-first search locates the current node; only its left or right child may be chosen.', [before.upgradeNode, upgrade.id]);
    this.emit('upgrade', { ...tower }); return success(`${upgrade.name} awakens.`);
  }
  sell(id = this.selectedTowerId) {
    const tower = this.getTower(id); if (!tower) return failure('Select a tower first.');
    const refund = Math.floor(tower.invested * 0.7); this.towers = this.towers.filter(t => t.id !== id); this.grid[tower.row][tower.col] = 'build'; this.coins += refund; this.selectedTowerId = null;
    this.recordAction({ kind: 'sell', id, before: this.towerSnapshot(tower), after: null, coinDelta: refund, runtime: this.towerRuntime(tower) }); this.emit('sell', { ...tower }); return success(`Returned ${refund} seeds to the grove.`);
  }
  applyDecision(action, forward) {
    const target = forward ? action.after : action.before, delta = forward ? action.coinDelta : -action.coinDelta;
    if (this.coins + delta < 0) return failure('Not enough seeds to restore that decision.');
    const current = this.getTower(action.id);
    if (target && this.grid[target.row]?.[target.col] !== 'build' && (!current || current.col !== target.col || current.row !== target.row)) return failure('That tile is now occupied.');
    if (action.kind === 'upgrade' && current && target) {
      // Stats are a decision; attack clocks, targeting preferences, and firing order are live simulation state.
      current.stats = copy(target.stats); current.level = target.level; current.upgradeNode = target.upgradeNode; current.invested = target.invested;
      this.selectedTowerId = current.id; this.emit('upgrade', { ...current });
    } else {
      if (current) { action.runtime = this.towerRuntime(current); this.grid[current.row][current.col] = 'build'; this.towers = this.towers.filter(t => t.id !== action.id); }
      if (target) { const runtime = action.runtime, tower = { ...copy(target), cooldown: runtime ? Math.max(0, runtime.cooldownReadyAt - this.time) : 0.2 }; if (runtime) { tower.mode = runtime.mode; if (runtime.firedAt !== undefined) tower.firedAt = runtime.firedAt; if (runtime.targetId !== undefined) tower.targetId = runtime.targetId; } this.towers.push(tower); this.grid[tower.row][tower.col] = 'tower'; this.selectedTowerId = tower.id; this.emit('placement', { ...tower }); } else { this.selectedTowerId = null; if (current) this.emit('sell', { ...current }); }
    }
    this.coins += delta; return success(`${forward ? 'Redid' : 'Undid'} ${action.kind}.`);
  }
  undo() { if (this.undoStack.isEmpty()) return failure('No decisions to undo.'); const action = this.undoStack.peek(), result = this.applyDecision(action, false); if (result.ok) { this.redoStack.push(this.undoStack.pop()); this.log('Stack', 'undo: pop → push', 'O(1) stack; O(T) tower update', 'Apply the inverse coin delta and restore the tower, preserving all enemy rewards.', [action.id]); } return result; }
  redo() { if (this.redoStack.isEmpty()) return failure('No decisions to redo.'); const action = this.redoStack.peek(), result = this.applyDecision(action, true); if (result.ok) { this.undoStack.push(this.redoStack.pop()); this.log('Stack', 'redo: pop → push', 'O(1) stack; O(T) tower update', 'Reapply the decision without rewinding game time or enemies.', [action.id]); } return result; }
  setTargetMode(id, mode) { const tower = this.getTower(id); if (!tower || !['first', 'last', 'strongest', 'weakest'].includes(mode)) return failure('Choose a valid target mode.'); tower.mode = mode; return success(`Targeting ${mode}.`); }
  togglePause() { this.paused = !this.paused; return success(this.paused ? 'The grove is resting.' : 'The grove awakens.'); }
  cycleSpeed() { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; return success(`${this.speed}× game speed.`); }
  setDifficulty(value) {
    if (!Number.isInteger(value) || !Object.hasOwn(DIFFICULTIES, value)) return failure('Choose a difficulty from 1 to 5.');
    if (this.phase !== 'ready') return failure('Adjust difficulty between waves.');
    this.difficulty = value; return success(`${DIFFICULTIES[value].name} difficulty selected.`);
  }
  startWave() {
    if (this.phase !== 'ready') return failure('Finish the current wave first.');
    const entries = generateWave(this.wave, this.difficulty); this.spawnQueue = new CircularQueue(128); entries.forEach(entry => this.spawnQueue.enqueue(entry));
    this.phase = 'wave'; this.paused = false; this.spawnClock = 0.3; this.waveStats = { kills: 0, leaked: 0, damage: 0, coins: 0, started: this.time }; this.waveTotal = entries.length;
    this.log('Circular queue', 'enqueue wave', 'O(n) for n enemies', 'FIFO preserves the authored wave sequence; head and tail wrap around a fixed buffer.', entries.map(e => e.type));
    this.emit('wave-start', { wave: this.wave, count: entries.length }); return success(`Wave ${this.wave} enters the forest.`);
  }
  update(dt) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0 || this.phase === 'defeat' || this.phase === 'victory') return;
    this.accumulator += Math.min(dt, 0.25) * this.speed;
    while (this.accumulator + 1e-10 >= STEP) { this.step(STEP); this.accumulator -= STEP; if (this.phase === 'defeat' || this.phase === 'victory') { this.accumulator = 0; break; } }
  }
  step(dt) {
    this.time += dt; if (this.phase !== 'wave') return;
    if (!this.spawnQueue.isEmpty()) { this.spawnClock -= dt; if (this.spawnClock <= 0) { const entry = this.spawnQueue.dequeue(); this.spawn(entry.type); this.spawnClock += entry.delay; this.log('Circular queue', 'dequeue enemy', 'O(1)', 'Remove the oldest queued invader and advance the circular head.', [entry.type]); } }
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const slowed = enemy.slowUntil > this.time ? enemy.slowFactor : 1;
      const surge = enemy.type === 'boss' && enemy.hp < enemy.maxHp * 0.5 ? 1.42 : 1;
      enemy.velocity += (enemy.speed * slowed * surge - enemy.velocity) * (1 - Math.exp(-dt * 6));
      enemy.progress += enemy.velocity * dt;
      const i = Math.floor(enemy.progress), fraction = enemy.progress - i;
      if (i >= this.path.length - 1) { enemy.hp = 0; enemy.escaped = true; this.health = Math.max(0, this.health - enemy.baseDamage); this.waveStats.leaked++; this.emit('leak', { enemyId: enemy.id, x: enemy.x, z: enemy.z, damage: enemy.baseDamage }); continue; }
      const a = this.path[i], b = this.path[i + 1]; enemy.x = a.x + (b.x - a.x) * fraction; enemy.z = a.z + (b.z - a.z) * fraction;
      enemy.angle = Math.atan2(b.x - a.x, b.z - a.z); enemy.heading = enemy.angle;
    }
    this.removeDead();
    if (this.health <= 0) { this.phase = 'defeat'; this.emit('defeat', { wave: this.wave }); return; }
    for (const tower of this.towers) { tower.cooldown -= dt; if (tower.cooldown <= 0) { const target = this.pickTarget(tower); if (target) { this.fire(tower, target); tower.cooldown = tower.stats.interval; } else tower.cooldown = 0.06; } }
    this.projectiles.filterInPlace(projectile => this.updateProjectile(projectile, dt));
    this.removeDead();
    if (this.spawnQueue.isEmpty() && this.enemies.length === 0) this.completeWave();
  }
  spawn(type) {
    const profile = DIFFICULTIES[this.difficulty], definition = ENEMY_TYPES[type], scale = 1 + (this.wave - 1) * (type === 'boss' ? 0.12 : 0.22), maxHp = Math.round(definition.hp * scale * profile.hp);
    const start = this.path[0], enemy = { id: this.nextId++, type, hp: maxHp, maxHp, speed: definition.speed * (1 + (this.wave - 1) * 0.018) * profile.speed, velocity: 0.15, x: start.x, z: start.z, progress: 0, angle: Math.PI / 2, heading: Math.PI / 2, reward: Math.max(1, Math.round(definition.reward * (1 + this.wave * 0.075) * profile.reward)), baseDamage: definition.baseDamage, slowUntil: 0, slowFactor: 1, bornAt: this.time, hitAt: -10, seed: this.random() };
    this.enemies.push(enemy); this.enemyTree.insert(enemy.id, enemy); this.log('BST', 'insert enemy ID', 'O(h), worst O(n)', 'An ordinary, unbalanced BST indexes live enemy objects by unique ID.', [enemy.id]); this.emit('spawn', { ...enemy }); return enemy;
  }
  priorityCompare(mode) {
    if (mode === 'last') return (a, b) => b.progress - a.progress || b.id - a.id;
    if (mode === 'strongest') return (a, b) => a.hp - b.hp || a.progress - b.progress;
    if (mode === 'weakest') return (a, b) => b.hp - a.hp || a.progress - b.progress;
    return (a, b) => a.progress - b.progress || b.id - a.id;
  }
  refreshTargetHeap(tower) {
    const heap = new MaxHeap(this.priorityCompare(tower.mode));
    for (const enemy of this.enemies) if (enemy.hp > 0 && distance(enemy, tower) <= tower.stats.range) heap.insert(enemy);
    this.targetHeap = heap; this.heapTowerId = tower.id;
    return heap;
  }
  pickTarget(tower) {
    const heap = this.refreshTargetHeap(tower);
    const target = heap.extractMax(); this.lastTargetId = target?.id ?? null;
    if (target) this.log('Max heap', 'extractMax target', 'O(n + k log k) rebuild; O(log k) extract', 'Scan all n enemies and insert k in-range enemies using current positions and health before every shot.', [target.id]);
    return target;
  }
  fire(tower, target) {
    tower.targetId = target.id; tower.firedAt = this.time; this.emit('shot', { towerId: tower.id, towerType: tower.type, x: tower.x, z: tower.z, targetId: target.id });
    if (tower.type === 'lightning') {
      const points = [{ x: tower.x, z: tower.z, y: 1.4 }], hit = new Set(); let current = target;
      for (let chain = 0; chain < tower.stats.chain && current; chain++) { points.push({ x: current.x, z: current.z, y: 0.5 }); hit.add(current.id); this.damage(current, tower.stats.damage * Math.pow(0.82, chain), 'lightning'); const heap = new MaxHeap(this.priorityCompare(tower.mode)); for (const next of this.enemies) if (next.hp > 0 && !hit.has(next.id) && distance(current, next) < 2.8) heap.insert(next); current = heap.extractMax(); }
      this.emit('lightning', { towerId: tower.id, points, x: tower.x, z: tower.z }); return;
    }
    for (let i = 0; i < tower.stats.multishot; i++) {
      const additional = i === 0 ? target : this.targetHeap.extractMax() || target;
      const projectile = { id: this.nextId++, type: tower.type, towerId: tower.id, targetId: additional.id, x: tower.x, y: 1.15, z: tower.z, originX: tower.x, originZ: tower.z, targetX: additional.x, targetZ: additional.z, damage: tower.stats.damage, speed: tower.type === 'frost' ? 8 : 15, age: 0, duration: tower.type === 'cannon' ? Math.max(0.45, distance(tower, additional) / 5.5) : 2.5, vx: 0, vy: 0, vz: 0 };
      this.projectiles.insert(projectile); this.log('Linked list', 'insert projectile at tail', 'O(1)', 'Each new projectile becomes the tail node of the active projectile list.', [projectile.id]);
    }
  }
  updateProjectile(projectile, dt) {
    projectile.age += dt;
    if (projectile.type === 'cannon') {
      const t = Math.min(1, projectile.age / projectile.duration), oldX = projectile.x, oldY = projectile.y, oldZ = projectile.z;
      projectile.x = projectile.originX + (projectile.targetX - projectile.originX) * t; projectile.z = projectile.originZ + (projectile.targetZ - projectile.originZ) * t; projectile.y = 1.15 * (1 - t) + 3.2 * 4 * t * (1 - t);
      projectile.vx = (projectile.x - oldX) / dt; projectile.vy = (projectile.y - oldY) / dt; projectile.vz = (projectile.z - oldZ) / dt;
      if (t >= 1) { for (const enemy of this.enemies) { const d = distance(projectile, enemy); if (enemy.hp > 0 && d < 1.8) this.damage(enemy, projectile.damage * (1 - 0.35 * d / 1.8), 'cannon'); } this.projectileImpact(projectile, 1.8); return false; }
    } else {
      const target = this.enemyTree.search(projectile.targetId);
      if (!target || target.hp <= 0 || projectile.age > projectile.duration) { this.log('Linked list', 'remove expired projectile', 'O(1) with traversal predecessor', 'A target that died or left the path is absent from the BST.', [projectile.id]); return false; }
      const dx = target.x - projectile.x, dz = target.z - projectile.z, dy = 0.42 - projectile.y, length = Math.hypot(dx, dy, dz), travel = projectile.speed * dt;
      if (length < travel + 0.16) { this.damage(target, projectile.damage, projectile.type); if (projectile.type === 'frost') { target.slowUntil = Math.max(target.slowUntil, this.time + (target.type === 'boss' ? 1.7 : 2.3)); target.slowFactor = target.type === 'resistant' ? 0.78 : 0.55; } projectile.x = target.x; projectile.z = target.z; this.projectileImpact(projectile, 0.35); return false; }
      projectile.vx = dx / length * projectile.speed; projectile.vy = dy / length * projectile.speed; projectile.vz = dz / length * projectile.speed; projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt; projectile.z += projectile.vz * dt;
    }
    return Math.abs(projectile.x) < 20 && Math.abs(projectile.z) < 20 && projectile.age < 5;
  }
  projectileImpact(projectile, radius) { this.emit('impact', { projectileType: projectile.type, x: projectile.x, y: 0.4, z: projectile.z, radius, targetId: projectile.targetId }); this.log('Linked list', 'unlink impact node', 'O(1) with traversal predecessor', 'Traversal retains the next pointer so consecutive impacts can be removed safely.', [projectile.id]); }
  damage(enemy, amount, type) { if (enemy.hp <= 0) return; if (enemy.type === 'resistant' && (type === 'frost' || type === 'lightning')) amount *= 0.45; const actual = Math.min(enemy.hp, amount); enemy.hp -= actual; enemy.hitAt = this.time; this.waveStats.damage += actual; this.emit('damage', { enemyId: enemy.id, x: enemy.x, z: enemy.z, damage: actual, source: type }); }
  removeDead() {
    this.enemies = this.enemies.filter(enemy => { if (enemy.hp > 0) return true; this.enemyTree.delete(enemy.id); this.log('BST', 'delete enemy ID', 'O(h), worst O(n)', 'Projectiles can no longer retrieve the removed enemy; two-child removal uses the inorder successor.', [enemy.id]); if (!enemy.escaped) { this.coins += enemy.reward; this.waveStats.coins += enemy.reward; this.waveStats.kills++; this.totalKills++; this.emit('death', { enemyId: enemy.id, enemyType: enemy.type, x: enemy.x, z: enemy.z, reward: enemy.reward }); } return false; });
  }
  completeWave() {
    const reward = Math.round((32 + this.wave * 7) * DIFFICULTIES[this.difficulty].reward); this.coins += reward;
    const record = { id: ++this.recordId, run: this.runId, wave: this.wave, difficulty: this.difficulty, kills: this.waveStats.kills, leaked: this.waveStats.leaked, damage: Math.round(this.waveStats.damage), earned: this.waveStats.coins + reward, health: this.health, duration: Math.round((this.time - this.waveStats.started) * 10) / 10 };
    this.history.insert(record.id, record); this.log('B-tree', 'insert completed wave', 'O(log n)', 'Full nodes split around their median; completed wave records remain in key order.', [record.id]);
    try { this.storage?.setItem(HISTORY_KEY, JSON.stringify(this.history.traverse())); } catch { /* A full storage quota does not interrupt play. */ }
    this.projectiles = new LinkedList(); this.emit('wave-complete', { wave: this.wave, reward, record });
    if (this.wave === 10) { this.phase = 'victory'; this.emit('victory', { health: this.health }); } else { this.wave++; this.phase = 'ready'; }
  }
  inspector() {
    const tower = this.getTower();
    const heapTower = tower || this.getTower(this.heapTowerId) || this.towers[0];
    if (heapTower) this.refreshTargetHeap(heapTower); else { this.targetHeap = new MaxHeap(); this.heapTowerId = null; }
    return {
      queue: this.spawnQueue.toArray().map(entry => ({ ...entry })), queueMeta: { head: this.spawnQueue.head, tail: this.spawnQueue.tail, capacity: this.spawnQueue.capacity, size: this.spawnQueue.size },
      linkedList: this.projectiles.toArray().map(p => ({ id: p.id, type: p.type, targetId: p.targetId })),
      heap: this.targetHeap.toArray().map(e => ({ id: e.id, progress: +e.progress.toFixed(2), hp: Math.ceil(e.hp), type: e.type })), heapTargetId: this.targetHeap.peek()?.id ?? null, heapLastExtractedId: this.lastTargetId, heapTowerId: this.heapTowerId, heapMode: heapTower?.mode || 'first',
      bst: this.enemyTree.snapshot(), bstOrdered: this.enemyTree.inorderTraversal().map(e => e.id),
      undo: this.undoStack.toArray().map(a => ({ kind: a.kind, id: a.id, coinDelta: a.coinDelta })), redo: this.redoStack.toArray().map(a => ({ kind: a.kind, id: a.id, coinDelta: a.coinDelta })),
      upgradeTree: copy(this.upgradeTrees[tower?.type || 'archer'].root), upgradeNode: tower?.upgradeNode || 'root', upgradeType: tower?.type || 'archer',
      btree: this.history.snapshot(), history: this.history.traverse(), btreeSplits: this.history.splits,
      bfs: { path: this.path.map(p => ({ ...p })), order: this.bfsResult.order.map(p => ({ ...p })), visited: this.bfsResult.visited.map(row => row.slice()), grid: this.grid.map(row => row.slice()), steps: this.bfsResult.order.length },
      operations: this.operations.slice(),
    };
  }
  serialize() { return { version: 1, difficulty: this.difficulty, health: this.health, coins: this.coins, wave: this.wave, phase: this.phase, paused: this.paused, speed: this.speed, time: this.time, accumulator: this.accumulator, spawnClock: this.spawnClock, nextId: this.nextId, seed: this.seed, towers: copy(this.towers), enemies: copy(this.enemies), projectiles: copy(this.projectiles.toArray()), queue: copy(this.spawnQueue.toArray()), undo: copy(this.undoStack.toArray()), redo: copy(this.redoStack.toArray()), history: copy(this.history.traverse()), recordId: this.recordId, runId: this.runId, selectedTowerId: this.selectedTowerId, waveStats: copy(this.waveStats), waveTotal: this.waveTotal || 0, totalKills: this.totalKills }; }
  restore(data) {
    try {
      const prepared = validateSave(data), saved = prepared.data;
      const next = { grid: prepared.grid, towers: saved.towers, enemies: saved.enemies, enemyTree: new BinarySearchTree(), projectiles: new LinkedList(), spawnQueue: new CircularQueue(128), undoStack: new Stack(), redoStack: new Stack(), history: new BTree(2) };
      for (const field of ['difficulty', 'health', 'coins', 'wave', 'phase', 'paused', 'speed', 'time', 'accumulator', 'spawnClock', 'nextId', 'seed', 'recordId', 'runId', 'selectedTowerId', 'waveStats', 'waveTotal', 'totalKills']) next[field] = saved[field];
      next.enemies.forEach(enemy => next.enemyTree.insert(enemy.id, enemy)); saved.projectiles.forEach(projectile => next.projectiles.insert(projectile)); saved.queue.forEach(entry => next.spawnQueue.enqueue(entry));
      saved.undo.forEach(action => next.undoStack.push(action)); saved.redo.forEach(action => next.redoStack.push(action));
      // Retain newer device history when loading an older snapshot; prepare the merge without touching live nodes.
      this.history.traverse(record => next.history.insert(record.id, copy(record)));
      for (const record of saved.history) if (!next.history.search(record.id)) next.history.insert(record.id, record);
      next.history.traverse(record => { next.recordId = Math.max(next.recordId, record.id); next.runId = Math.max(next.runId, record.run); });
      Object.assign(this, next, { targetHeap: new MaxHeap(), lastTargetId: null, heapTowerId: null, effects: [], operations: [] });
      this.log('BST', 'restore live enemy index', 'O(n²) worst-case unbalanced BST', 'Insert validated live enemy objects into an independent BST before atomically replacing the active simulation.', next.enemies.map(enemy => enemy.id));
      this.log('Linked list', 'restore active projectiles', 'O(p) for p projectiles', 'Append validated projectiles in saved traversal order to reconstruct the head, tail and links.', saved.projectiles.map(projectile => projectile.id));
      this.log('Circular queue', 'restore pending wave', 'O(n) for n queued enemies', 'Enqueue the saved pending invaders in their original FIFO order.', saved.queue.map(entry => entry.type));
      this.log('Stack', 'restore player decisions', 'O(a) for a decisions', 'Push saved undo and redo entries in their recorded order, preserving tower snapshots and coin deltas.', [...saved.undo, ...saved.redo].map(action => action.id));
      this.log('B-tree', 'restore wave history', 'O(h log h) for h records', 'Merge device history with the saved records in a new B-tree, retaining newer completed waves.', next.history.traverse().map(record => record.id));
      return success('Your grove has been restored.');
    } catch (error) { return failure(error instanceof Error && !error.message.includes('JSON') ? error.message : 'That saved grove could not be read.'); }
  }
  save(storage = this.storage) { try { if (!storage) return failure('Local storage is unavailable.'); storage.setItem(SAVE_KEY, JSON.stringify(this.serialize())); return success('Grove saved, including the current wave.'); } catch { return failure('The browser could not save this grove.'); } }
  load(storage = this.storage) { try { const raw = storage?.getItem(SAVE_KEY); if (!raw) return failure('No saved grove yet.'); return this.restore(JSON.parse(raw)); } catch { return failure('That saved grove could not be read.'); } }
}
