import test from 'node:test';
import assert from 'node:assert/strict';
import { CircularQueue, Stack, LinkedList, MaxHeap, BinarySearchTree, BinaryTree, BTree, bfs } from '../src/dsa/structures.js';
import { GameEngine, TOWER_TYPES } from '../src/game/engine.js';
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
});
