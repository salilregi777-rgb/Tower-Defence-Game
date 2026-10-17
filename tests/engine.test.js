import test from 'node:test';
import assert from 'node:assert/strict';
import { CircularQueue, Stack, LinkedList, MaxHeap, BinarySearchTree, BinaryTree, BTree, bfs } from '../src/dsa/structures.js';
import { GameEngine, TOWER_TYPES } from '../src/game/reference-engine.js';
import { generateWave } from '../src/game/config.js';

const engine = () => new GameEngine({ storage: null });
const run = (game, seconds, fps = 60) => { for (let i = 0; i < seconds * fps; i++) game.update(1 / fps); };

test('circular queue wraps, maintains FIFO, and rejects overflow', () => {
  const q = new CircularQueue(3); assert.equal(q.dequeue(), undefined);
  q.enqueue('a'); q.enqueue('b'); q.enqueue('c'); assert.equal(q.isFull(), true); assert.throws(() => q.enqueue('d'));
  assert.equal(q.dequeue(), 'a'); q.enqueue('d'); assert.deepEqual(q.toArray(), ['b', 'c', 'd']); assert.equal(q.peek(), 'b');
  assert.equal(q.dequeue(), 'b'); assert.equal(q.dequeue(), 'c'); assert.equal(q.dequeue(), 'd'); assert.equal(q.isEmpty(), true);
});

test('stack LIFO and linked-list adjacent/head/tail removals keep invariants', () => {
  const stack = new Stack(); stack.push(1); stack.push(2); assert.equal(stack.pop(), 2); assert.equal(stack.peek(), 1); stack.pop(); assert.equal(stack.isEmpty(), true);
  const list = new LinkedList(); for (let id = 1; id <= 6; id++) list.insert({ id });
  assert.equal(list.search(4).id, 4); list.filterInPlace(value => value.id === 3 || value.id === 4); assert.deepEqual(list.toArray().map(v => v.id), [3, 4]);
  list.delete(3); list.delete(4); assert.equal(list.head, null); assert.equal(list.tail, null); assert.equal(list.size, 0);
  list.insert({ id: 9 }); assert.equal(list.head, list.tail); assert.equal(list.search(9).id, 9);
});

test('max heap selects by comparator and maintains parent dominance after each operation', () => {
  const heap = new MaxHeap((a, b) => a.priority - b.priority);
  for (const priority of [2, 9, -3, 7, 9, 1, 30, 4]) { heap.insert({ priority }); for (let i = 1; i < heap.size; i++) assert.ok(heap.items[Math.floor((i - 1) / 2)].priority >= heap.items[i].priority); }
  const priorities = []; while (heap.size) priorities.push(heap.extractMax().priority);
  assert.deepEqual(priorities, [30, 9, 9, 7, 4, 2, 1, -3]); assert.equal(heap.extractMax(), undefined);
});

test('BST handles leaf, one-child and two-child deletion without losing live references', () => {
  const tree = new BinarySearchTree(); for (const id of [8, 3, 10, 1, 6, 14, 4, 7, 13]) tree.insert(id, { id });
  const object = tree.search(6); object.hp = 70; assert.equal(tree.search(6).hp, 70);
  assert.equal(tree.delete(1).id, 1); assert.equal(tree.delete(14).id, 14); assert.equal(tree.delete(8).id, 8);
  assert.deepEqual(tree.inorderTraversal().map(v => v.id), [3, 4, 6, 7, 10, 13]); assert.equal(tree.size, 6); assert.equal(tree.search(8), undefined); assert.equal(tree.delete(999), undefined); assert.equal(tree.size, 6);
});

test('genuine B-tree splits preserve bounds, balanced leaf depth, values, and ordered traversal', () => {
  const tree = new BTree(2), ids = Array.from({ length: 100 }, (_, i) => i + 1);
  for (let i = 99; i > 0; i--) { const j = (i * 19 + 7) % (i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  ids.forEach(id => tree.insert(id, { id, wave: id % 10 + 1 }));
  let leafDepth;
  const verify = (node, depth, min, max, root = false) => {
    assert.ok(node.keys.length <= 3); if (!root) assert.ok(node.keys.length >= 1);
    node.keys.forEach((key, i) => { assert.ok(key > min && key < max); if (i) assert.ok(key > node.keys[i - 1]); assert.equal(node.values[i].id, key); });
    if (node.leaf) { leafDepth ??= depth; assert.equal(depth, leafDepth); assert.equal(node.children.length, 0); }
    else { assert.equal(node.children.length, node.keys.length + 1); node.children.forEach((child, i) => verify(child, depth + 1, i ? node.keys[i - 1] : min, i < node.keys.length ? node.keys[i] : max)); }
  };
  verify(tree.root, 0, -Infinity, Infinity, true); assert.ok(tree.splits > 20); assert.equal(tree.size, 100);
  assert.deepEqual(tree.traverse().map(v => v.id), Array.from({ length: 100 }, (_, i) => i + 1));
  for (let i = 1; i <= 100; i++) assert.equal(tree.search(i).id, i);
  tree.insert(42, { id: 42, changed: true }); assert.equal(tree.size, 100); assert.equal(tree.search(42).changed, true);
});

test('BFS finds shortest orthogonal routes with custom FIFO and rejects disconnected end', () => {
  const grid = [['path', 'path', 'path'], ['path', 'obstacle', 'path'], ['path', 'path', 'path']];
  const result = bfs(grid, { col: 0, row: 0 }, { col: 2, row: 2 }); assert.equal(result.path.length, 5);
  grid[2][1] = 'obstacle'; grid[1][2] = 'obstacle'; assert.equal(bfs(grid, { col: 0, row: 0 }, { col: 2, row: 2 }).path.length, 0);
  const game = engine(); assert.equal(game.path.length, 32); for (let i = 1; i < game.path.length; i++) assert.equal(Math.abs(game.path[i].x - game.path[i - 1].x) + Math.abs(game.path[i].z - game.path[i - 1].z), 1);
});

test('placement validation, upgrade branches and undo/redo preserve unrelated earned coins', () => {
  const game = engine(); assert.equal(game.place('archer', 0, 5).ok, false); assert.equal(game.place('archer', 0, 0).ok, false); assert.equal(game.place('archer', -1, 4).ok, false);
  assert.equal(game.place('archer', 5, 8).ok, true); const id = game.selectedTowerId; assert.equal(game.coins, 145);
  game.coins += 17; assert.equal(game.undo().ok, true); assert.equal(game.coins, 217); assert.equal(game.grid[8][5], 'build');
  assert.equal(game.redo().ok, true); assert.equal(game.coins, 162); assert.equal(game.getTower(id).stats.damage, 18);
  assert.equal(game.upgrade(id, 'power').ok, true); assert.equal(game.getTower(id).level, 2); assert.equal(game.upgrade(id, 'speed-rapid').ok, false);
  const upgradedDamage = game.getTower(id).stats.damage; game.undo(); assert.equal(game.getTower(id).stats.damage, 18); game.redo(); assert.equal(game.getTower(id).stats.damage, upgradedDamage);
  const beforeSale = game.coins; game.sell(id); game.coins += 11; game.undo(); assert.equal(game.coins, beforeSale + 11); assert.equal(game.getTower(id).stats.damage, upgradedDamage);
  game.redo(); assert.equal(game.getTower(id), undefined); game.undo(); game.undo(); game.place('archer', 9, 5); assert.equal(game.redoStack.isEmpty(), true);
  const binary = new BinaryTree(game.upgradeTrees.archer.root); assert.equal(binary.children('root').length, 2); assert.equal(binary.children('power-force').length, 0);
});

test('all four tower types deal damage; frost slows, lightning chains, cannon splashes', () => {
  for (const type of Object.keys(TOWER_TYPES)) {
    const game = engine(); game.place(type, 5, 8); game.phase = 'wave';
    const targets = Array.from({ length: 3 }, (_, i) => { const enemy = game.spawn('tank'); enemy.progress = 8 + i * 0.3; enemy.hp = enemy.maxHp = 10000; enemy.speed = enemy.velocity = 0; return enemy; });
    run(game, 3); assert.ok(targets.some(e => e.hp < e.maxHp), `${type} must damage enemies`);
    if (type === 'frost') assert.ok(targets.some(e => e.slowUntil > 0 && e.slowFactor < 1));
    if (type === 'lightning' || type === 'cannon') assert.ok(targets.every(e => e.hp < e.maxHp), `${type} hits multiple targets`);
  }
});

test('all four target modes use current in-range enemy priorities', () => {
  const game = engine(); game.place('archer', 5, 8); const tower = game.getTower();
  const a = game.spawn('basic'), b = game.spawn('tank'), c = game.spawn('runner');
  Object.assign(a, { x: tower.x, z: tower.z, progress: 8, hp: 40 }); Object.assign(b, { x: tower.x + 1, z: tower.z, progress: 4, hp: 160 }); Object.assign(c, { x: tower.x, z: tower.z + 1, progress: 5, hp: 20 });
  for (const [mode, target] of [['first', a], ['last', b], ['strongest', b], ['weakest', c]]) { game.setTargetMode(tower.id, mode); assert.equal(game.pickTarget(tower).id, target.id); }
  c.x = 100; assert.equal(game.pickTarget(tower).id, a.id);
  a.hp = 200; game.setTargetMode(tower.id, 'strongest'); assert.equal(game.pickTarget(tower).id, a.id);
});

test('resistance, boss rage and deterministic queue recipes have gameplay consequences', () => {
  const game = engine(), resistant = game.spawn('resistant'); const initial = resistant.hp;
  game.damage(resistant, 20, 'frost'); assert.equal(initial - resistant.hp, 9); game.damage(resistant, 20, 'archer'); assert.equal(initial - resistant.hp, 29);
  for (let wave = 1; wave <= 10; wave++) assert.equal(generateWave(wave).filter(e => e.type === 'boss').length, wave % 5 === 0 ? 1 : 0);
  const boss = game.spawn('boss'); game.phase = 'wave'; boss.hp = boss.maxHp * 0.4; boss.velocity = boss.speed; game.update(1 / 60); assert.ok(boss.velocity > boss.speed);
});

test('fixed simulation timestep produces identical results at 30, 60 and 120 FPS', () => {
  const games = [30, 60, 120].map(fps => { const game = engine(); game.place('archer', 5, 8); game.place('frost', 7, 7); game.startWave(); run(game, 12, fps); return game; });
  assert.deepEqual(games[0].serialize(), games[1].serialize()); assert.deepEqual(games[1].serialize(), games[2].serialize());
  const game = games[0], time = game.time; game.togglePause(); run(game, 2); assert.equal(game.time, time); game.togglePause(); game.cycleSpeed(); run(game, 1); assert.ok(Math.abs(game.time - time - 2) < 1e-8);
});

test('mid-wave save/load restores projectiles, queue, BST references, upgrades and decisions', () => {
  const original = engine(); original.place('archer', 5, 8); original.place('frost', 7, 7); original.upgrade(original.towers[0].id, 'power'); original.startWave();
  for (let frame = 0; frame < 300 && original.projectiles.size === 0; frame++) original.update(1 / 60);
  assert.ok(original.enemies.length > 0); assert.ok(original.projectiles.size > 0); assert.ok(original.spawnQueue.size > 0);
  const saved = original.serialize(), restored = engine(); assert.equal(restored.restore(saved).ok, true); assert.deepEqual(restored.serialize(), saved);
  for (const enemy of restored.enemies) assert.equal(restored.enemyTree.search(enemy.id), enemy);
  run(original, 30); run(restored, 30); assert.deepEqual(restored.serialize(), original.serialize());
  const beforeInvalid = restored.serialize(); assert.equal(restored.restore({ version: 999 }).ok, false); assert.deepEqual(restored.serialize(), beforeInvalid);
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }; original.save(storage); const loaded = engine(); assert.equal(loaded.load(storage).ok, true); assert.deepEqual(loaded.serialize(), original.serialize());
});

test('ten waves are winnable with earned income and both bosses; history is a split B-tree', () => {
  const game = engine();
  const positions = [['archer', 5, 8], ['frost', 7, 7], ['archer', 9, 5], ['cannon', 7, 3], ['lightning', 12, 4], ['archer', 4, 6], ['cannon', 9, 8], ['lightning', 11, 3], ['archer', 6, 10], ['frost', 12, 6]];
  for (let wave = 1; wave <= 10; wave++) {
    for (const [type, col, row] of positions) if (game.grid[row][col] === 'build') game.place(type, col, row);
    for (const tower of game.towers) for (let i = 0; i < 2; i++) { const options = game.getUpgradeOptions(tower.id); if (options.length) game.upgrade(tower.id, options[0].id); }
    assert.equal(game.startWave().ok, true); for (let step = 0; step < 12000 && game.phase === 'wave'; step++) game.update(1 / 60);
    assert.notEqual(game.phase, 'wave', `wave ${wave} must finish`); assert.notEqual(game.phase, 'defeat');
  }
  assert.equal(game.phase, 'victory'); assert.equal(game.wave, 10); assert.equal(game.totalKills, 227); assert.equal(game.history.size, 10); assert.ok(game.history.splits > 0);
  assert.deepEqual(game.history.traverse().map(record => record.wave), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(game.history.search(10).wave, 10); assert.equal(game.startWave().ok, false);
});

test('undefended enemies harm the grove and eventually trigger defeat; restart resets simulation', () => {
  const game = engine();
  for (let wave = 0; wave < 10 && game.phase !== 'defeat'; wave++) { game.startWave(); for (let step = 0; step < 12000 && game.phase === 'wave'; step++) game.update(1 / 60); }
  assert.equal(game.phase, 'defeat'); assert.equal(game.health, 0); game.restart(); assert.equal(game.health, 100); assert.equal(game.coins, 200); assert.equal(game.wave, 1); assert.equal(game.phase, 'ready'); assert.equal(game.enemies.length, 0); assert.equal(game.projectiles.size, 0); assert.equal(game.undoStack.size, 0);
  assert.equal(game.waveTotal, 0);
});

test('visual effect event names survive tower and enemy type payloads', () => {
  const game = engine(); game.place('archer', 5, 8); const id = game.selectedTowerId;
  game.upgrade(id, 'power'); game.sell(id); game.spawn('runner');
  const effects = game.drainEffects();
  assert.deepEqual(effects.map(effect => effect.type), ['placement', 'upgrade', 'sell', 'spawn']);
  assert.deepEqual(effects.map(effect => effect.entityType), ['archer', 'archer', 'archer', 'runner']);
  game.time = 4; game.emit('impact', { type: 'cannon', time: 999 });
  assert.equal(game.effects[0].type, 'impact'); assert.equal(game.effects[0].time, 4);
  assert.equal(game.effects[0].entityType, 'cannon');
});

test('upgrade undo preserves live targeting, attack clocks, tower identity and firing order', () => {
  const game = engine(); game.place('archer', 5, 8); const tower = game.getTower();
  game.place('archer', 9, 5); const order = game.towers.slice();
  game.upgrade(tower.id, 'power');
  Object.assign(tower, { mode: 'strongest', cooldown: 0.61, targetId: 700, firedAt: 3.5 });
  assert.equal(game.undo().ok, true); assert.equal(game.getTower(tower.id), tower);
  assert.deepEqual(game.towers, order); assert.equal(tower.stats.damage, 18);
  assert.equal(tower.mode, 'strongest'); assert.equal(tower.cooldown, 0.61); assert.equal(tower.targetId, 700); assert.equal(tower.firedAt, 3.5);
  assert.equal(game.redo().ok, true); assert.equal(game.getTower(tower.id), tower); assert.ok(tower.stats.damage > 18);
  assert.equal(tower.mode, 'strongest'); assert.equal(tower.cooldown, 0.61);
});

test('sale undo retains elapsed attack cooldown and current target preferences', () => {
  const game = engine(); game.place('archer', 5, 8); const tower = game.getTower();
  tower.cooldown = 0.8; tower.mode = 'last'; tower.firedAt = 0;
  game.sell(tower.id); run(game, 0.3); assert.equal(game.undo().ok, true);
  assert.ok(Math.abs(game.getTower(tower.id).cooldown - 0.5) < 1e-8);
  assert.equal(game.getTower(tower.id).mode, 'last'); assert.equal(game.getTower(tower.id).firedAt, 0);
  game.redo(); run(game, 1); game.undo(); assert.equal(game.getTower(tower.id).cooldown, 0);
});

test('inspector reconstructs an actual heap after priorities and range change', () => {
  const game = engine(); game.place('archer', 5, 8); const tower = game.getTower();
  const enemies = [4, 8, 6, 1, 3].map((progress, i) => Object.assign(game.spawn('basic'), { x: tower.x, z: tower.z, hp: 10 + i, progress }));
  game.pickTarget(tower); enemies[0].progress = 15; enemies[1].hp = 0; enemies[2].x = 100;
  for (const mode of ['first', 'last', 'strongest', 'weakest']) {
    game.setTargetMode(tower.id, mode); const snapshot = game.inspector(), compare = game.priorityCompare(mode);
    const heap = snapshot.heap.map(value => game.enemyTree.search(value.id));
    assert.equal(heap.length, 3); assert.equal(snapshot.heapMode, mode); assert.equal(snapshot.heapTargetId, heap[0].id);
    for (let index = 1; index < heap.length; index++) assert.ok(compare(heap[Math.floor((index - 1) / 2)], heap[index]) >= 0);
  }
  assert.equal(game.lastTargetId, enemies[1].id, 'inspecting must not overwrite the actual last shot');
});

test('invalid save metadata and decisions never partially replace the live simulation', () => {
  const game = engine(); game.place('archer', 5, 8); game.startWave(); run(game, 2);
  const before = game.serialize(), towers = game.towers, enemies = game.enemies, tree = game.enemyTree, history = game.history;
  const mutations = [
    save => { save.undo = [null]; },
    save => { save.undo[0].after.stats = null; },
    save => { save.undo[0].coinDelta = 0; },
    save => { save.undo[0].runtime = null; },
    save => { save.undo[0].runtime = { cooldownReadyAt: save.time, mode: 'first', targetId: {} }; },
    save => { save.undo[0].runtime = { cooldownReadyAt: save.time, mode: 'first', firedAt: [] }; },
    save => { save.history = [null]; },
    save => { save.waveStats = null; },
    save => { save.paused = 'false'; },
    save => { save.selectedTowerId = 0; },
    save => { save.recordId = '0'; },
    save => { save.queue[0].delay = false; },
    save => { save.enemies[0].hp = -1; },
    save => { save.towers.push(structuredClone(save.towers[0])); },
  ];
  for (const mutate of mutations) {
    const save = structuredClone(before); mutate(save);
    assert.equal(game.restore(save).ok, false); assert.deepEqual(game.serialize(), before);
    assert.equal(game.towers, towers); assert.equal(game.enemies, enemies); assert.equal(game.enemyTree, tree); assert.equal(game.history, history);
  }
});

test('save/load preserves an empty selection and detaches restored objects from its input', () => {
  const original = engine(); original.place('archer', 5, 8); original.selectTower(null);
  const saved = original.serialize(), game = engine(); assert.equal(game.restore(saved).ok, true);
  assert.equal(game.selectedTowerId, null); assert.deepEqual(game.serialize(), saved);
  saved.towers[0].stats.damage = 999; assert.equal(game.towers[0].stats.damage, 18);
});

test('BFS rejects blocked endpoints, malformed coordinates and nonrectangular grids', () => {
  const grid = [['obstacle', 'path'], ['path', 'path']];
  assert.deepEqual(bfs(grid, { col: 0, row: 0 }, { col: 1, row: 1 }).path, []);
  assert.deepEqual(bfs(grid, { col: 1, row: 1 }, { col: 0, row: 0 }).path, []);
  assert.deepEqual(bfs(grid, { col: 0.5, row: 1 }, { col: 1, row: 1 }).path, []);
  assert.deepEqual(bfs([['path'], ['path', 'path']], { col: 0, row: 0 }, { col: 0, row: 1 }).path, []);
  assert.deepEqual(bfs([], { col: 0, row: 0 }, { col: 0, row: 0 }).path, []);
});

test('difficulty changes are exact, between-wave decisions and survive restart', () => {
  const game = engine(); assert.equal(game.difficulty, 3);
  for (const invalid of [0, 6, 2.5, '4', null, undefined, NaN, Infinity, true]) {
    const before = game.serialize(); assert.equal(game.setDifficulty(invalid).ok, false); assert.deepEqual(game.serialize(), before);
  }
  assert.equal(game.setDifficulty(5).ok, true); assert.equal(game.difficulty, 5);
  game.startWave(); run(game, 1); const active = game.serialize();
  assert.equal(game.setDifficulty(1).ok, false); assert.deepEqual(game.serialize(), active);
  game.togglePause(); assert.equal(game.setDifficulty(1).ok, false, 'pausing must not unlock active wave difficulty');
  game.restart(); assert.equal(game.difficulty, 5); assert.equal(game.health, 100); assert.equal(game.coins, 200);
  assert.equal(game.setDifficulty(2).ok, true); assert.equal(game.difficulty, 2);
  game.phase = 'victory'; assert.equal(game.setDifficulty(1).ok, false);
  game.phase = 'defeat'; assert.equal(game.setDifficulty(1).ok, false);
});

test('harder difficulty creates healthier faster crowds, shorter spawn intervals and lower individual rewards', () => {
  const games = [1, 2, 3, 4, 5].map(value => { const game = engine(); game.setDifficulty(value); game.wave = 10; game.startWave(); return game; });
  const invaders = games.map(game => game.spawn('tank'));
  for (let index = 1; index < games.length; index++) {
    assert.ok(invaders[index].maxHp > invaders[index - 1].maxHp);
    assert.ok(invaders[index].speed > invaders[index - 1].speed);
    assert.ok(invaders[index].reward <= invaders[index - 1].reward);
    assert.ok(games[index].spawnQueue.peek().delay < games[index - 1].spawnQueue.peek().delay);
    assert.ok(games[index].waveTotal >= games[index - 1].waveTotal);
    assert.equal(games[index].spawnQueue.toArray().filter(entry => entry.type === 'boss').length, 1);
  }
  assert.ok(games[4].waveTotal > games[2].waveTotal);
  assert.equal(invaders[2].maxHp, Math.round(168 * (1 + 9 * 0.22) * 1.35), 'default is harder than the original baseline');
});

test('difficulty persists in active saves, legacy saves migrate, and invalid values fail atomically', () => {
  const original = engine(); original.setDifficulty(5); original.place('archer', 5, 8); original.startWave(); run(original, 2);
  const saved = original.serialize(), restored = engine(); assert.equal(restored.restore(saved).ok, true); assert.equal(restored.difficulty, 5);
  run(original, 3); run(restored, 3); assert.deepEqual(restored.serialize(), original.serialize());
  const before = restored.serialize();
  for (const difficulty of [0, 6, 1.5, '3', null, false]) {
    assert.equal(restored.restore({ ...before, difficulty }).ok, false); assert.deepEqual(restored.serialize(), before);
  }
  const legacy = structuredClone(saved); delete legacy.difficulty;
  assert.equal(restored.restore(legacy).ok, true); assert.equal(restored.difficulty, 3);
  assert.equal(legacy.difficulty, undefined, 'migration must not modify the caller snapshot');
});

test('keeping only starter defenses loses, while reinvesting earned seeds can beat Siege', () => {
  const positions = [['archer', 5, 8], ['frost', 7, 7], ['archer', 9, 5], ['cannon', 7, 3], ['lightning', 12, 4], ['archer', 4, 6], ['cannon', 9, 8], ['lightning', 11, 3], ['archer', 6, 10], ['frost', 12, 6]];
  const campaign = (difficulty, reinvest) => {
    const game = engine(); game.setDifficulty(difficulty);
    for (let wave = 1; wave <= 10 && game.phase !== 'defeat'; wave++) {
      if (wave === 1 || reinvest) {
        for (const [type, col, row] of positions) if (game.grid[row][col] === 'build') game.place(type, col, row);
        for (const tower of game.towers) for (let upgrade = 0; upgrade < 2; upgrade++) { const options = game.getUpgradeOptions(tower.id); if (options.length) game.upgrade(tower.id, options[0].id); }
      }
      assert.ok(game.coins >= 0); assert.equal(game.startWave().ok, true);
      for (let frame = 0; frame < 12000 && game.phase === 'wave'; frame++) game.update(1 / 60);
      assert.notEqual(game.phase, 'wave');
    }
    return game;
  };
  const gentle = campaign(1, false), resolute = campaign(3, false), siege = campaign(5, false);
  for (const game of [gentle, resolute, siege]) { assert.equal(game.phase, 'defeat'); assert.ok(game.coins > 0, 'unspent rewards cannot defend the grove'); }
  assert.ok(siege.wave < resolute.wave); assert.ok(resolute.wave < gentle.wave);
  const victory = campaign(5, true); assert.equal(victory.phase, 'victory'); assert.ok(victory.health > 0 && victory.health < 100);
  assert.ok(victory.towers.reduce((total, tower) => total + tower.invested, 0) > 200, 'the victory strategy reinvests earned income');
  assert.ok(victory.history.traverse().every(record => record.difficulty === 5));
  const restored = engine(); assert.equal(restored.restore(victory.serialize()).ok, true);
  const invalid = victory.serialize(); invalid.history[0].difficulty = '5'; assert.equal(restored.restore(invalid).ok, false);
  const legacy = victory.serialize(); legacy.history.forEach(record => { delete record.difficulty; }); assert.equal(engine().restore(legacy).ok, true);
});

test('inspector retains actual queue and decision operations after sustained combat', () => {
  const game = engine(); game.place('archer', 5, 8); game.upgrade(game.selectedTowerId, 'power'); game.place('frost', 7, 7); game.startWave();
  run(game, 25);
  const operations = game.inspector().operations;
  for (const structure of ['BFS', 'Stack', 'Binary tree', 'Circular queue', 'Max heap', 'Linked list', 'BST']) {
    const events = operations.filter(operation => operation.structure === structure);
    assert.ok(events.length > 0, `${structure} must retain actual evidence after other structures become busy`);
    assert.ok(events.length <= 12, `${structure} history remains bounded`);
  }
  assert.equal(operations.filter(operation => operation.structure === 'Circular queue').at(-1).operation, 'dequeue enemy');
  assert.equal(operations.find(operation => operation.structure === 'BFS').operation, 'find shortest route');
  assert.ok(operations.length <= 8 * 12);
  for (let index = 1; index < operations.length; index++) assert.ok(operations[index].time >= operations[index - 1].time);
  game.restart(); assert.deepEqual(game.operations.map(operation => operation.structure), ['BFS']);
});

test('restored structures expose operations under the inspector tab identifiers', () => {
  const original = engine(); original.place('archer', 5, 8); original.startWave(); run(original, 4);
  const restored = engine(); assert.equal(restored.restore(original.serialize()).ok, true);
  const operations = restored.inspector().operations;
  for (const structure of ['BST', 'Linked list', 'Circular queue', 'Stack', 'B-tree']) assert.equal(operations.filter(operation => operation.structure === structure).length, 1);
  assert.deepEqual(operations.find(operation => operation.structure === 'Circular queue').nodes, restored.spawnQueue.toArray().map(entry => entry.type));
  assert.deepEqual(operations.find(operation => operation.structure === 'BST').nodes, restored.enemies.map(enemy => enemy.id));
  assert.deepEqual(operations.find(operation => operation.structure === 'Linked list').nodes, restored.projectiles.toArray().map(projectile => projectile.id));
});
