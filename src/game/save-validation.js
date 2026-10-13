import { DEFAULT_DIFFICULTY, DIFFICULTIES, TOWER_TYPES, ENEMY_TYPES, createBattlefield, createUpgradeTrees } from './config.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const list = (value, max = 10000) => Array.isArray(value) && value.length <= max;

/** Validate a detached copy; callers must not mutate their live state before this succeeds. */
export function validateSave(input) {
  const data = JSON.parse(JSON.stringify(input));
  check(object(data) && data.version === 1, 'This saved grove is not compatible.');
  if (!Object.hasOwn(data, 'difficulty')) data.difficulty = DEFAULT_DIFFICULTY;
  check(Number.isInteger(data.difficulty) && Object.hasOwn(DIFFICULTIES, data.difficulty), 'Invalid saved difficulty.');
  for (const key of ['towers', 'enemies', 'projectiles', 'queue', 'undo', 'redo', 'history']) check(list(data[key]), `Invalid saved ${key}.`);
  check(integer(data.health, 0, 100) && integer(data.coins) && integer(data.wave, 1, 10), 'Invalid saved economy.');
  check(['ready', 'wave', 'victory', 'defeat'].includes(data.phase) && typeof data.paused === 'boolean' && [1, 2, 3].includes(data.speed), 'Invalid saved game state.');
  check(finite(data.time) && finite(data.accumulator, -1e-9, 0.25) && finite(data.spawnClock, -1, 10), 'Invalid saved simulation clock.');
  check(integer(data.seed, 0, 4294967295) && integer(data.nextId, 1) && integer(data.recordId) && integer(data.runId, 1) && integer(data.waveTotal) && integer(data.totalKills), 'Invalid saved counters.');
  check((data.phase !== 'defeat' || data.health === 0) && (data.phase !== 'victory' || data.wave === 10), 'Invalid saved outcome.');
  const trees = createUpgradeTrees(), terrain = createBattlefield(), grid = createBattlefield(), ids = new Set();
  const knownId = id => integer(id, 1, data.nextId - 1);
  const liveId = id => { check(knownId(id) && !ids.has(id), 'Invalid or duplicate entity ID.'); ids.add(id); };
  const towerValid = (tower, active = false) => {
    check(object(tower) && Object.hasOwn(TOWER_TYPES, tower.type) && knownId(tower.id), 'Invalid saved tower.');
    check(integer(tower.col, 0, 16) && integer(tower.row, 0, 12) && terrain[tower.row][tower.col] === 'build' && tower.x === tower.col - 8 && tower.z === tower.row - 6, 'Invalid saved tower location.');
    check(['first', 'last', 'strongest', 'weakest'].includes(tower.mode) && integer(tower.level, 1, 3) && integer(tower.invested, 1) && trees[tower.type].search(tower.upgradeNode), 'Invalid saved tower upgrade.');
    const stats = tower.stats;
    check(object(stats) && finite(stats.damage, 0.01) && finite(stats.range, 0.1, 20) && finite(stats.interval, 0.02, 20) && integer(stats.multishot, 1, 8) && integer(stats.chain, 1, 10), 'Invalid saved tower statistics.');
    check(finite(tower.plantedAt, 0, data.time) && (tower.firedAt === undefined || finite(tower.firedAt, 0, data.time)) && (tower.targetId === undefined || knownId(tower.targetId)), 'Invalid saved tower timing.');
    if (active) check(finite(tower.cooldown, -0.1, 20), 'Invalid saved attack cooldown.');
  };
  check(data.towers.length <= 221 && data.enemies.length <= 128 && data.projectiles.length <= 4096 && data.queue.length <= 128, 'The save contains too many entities.');
  for (const tower of data.towers) { towerValid(tower, true); liveId(tower.id); check(grid[tower.row][tower.col] === 'build', 'Two towers occupy the same tile.'); grid[tower.row][tower.col] = 'tower'; }
  check(data.selectedTowerId === null || data.towers.some(tower => tower.id === data.selectedTowerId), 'Invalid saved selection.');
  for (const enemy of data.enemies) {
    check(object(enemy) && Object.hasOwn(ENEMY_TYPES, enemy.type), 'Invalid saved enemy.'); liveId(enemy.id);
    check(finite(enemy.maxHp, 1) && finite(enemy.hp, 0.001, enemy.maxHp) && finite(enemy.progress, 0, 31) && finite(enemy.x, -8, 8) && finite(enemy.z, -6, 6), 'Invalid saved enemy position or health.');
    for (const key of ['speed', 'velocity', 'reward', 'baseDamage', 'slowUntil', 'bornAt', 'seed']) check(finite(enemy[key]), 'Invalid saved enemy statistics.');
    check(finite(enemy.angle, -Math.PI, Math.PI) && finite(enemy.heading, -Math.PI, Math.PI) && finite(enemy.hitAt, -10, data.time) && finite(enemy.slowFactor, 0.01, 1), 'Invalid saved enemy motion.');
  }
  for (const projectile of data.projectiles) {
    check(object(projectile) && ['archer', 'cannon', 'frost'].includes(projectile.type), 'Invalid saved projectile.'); liveId(projectile.id);
    check(knownId(projectile.targetId) && knownId(projectile.towerId), 'Invalid saved projectile link.');
    for (const key of ['x', 'y', 'z', 'originX', 'originZ', 'targetX', 'targetZ', 'vx', 'vy', 'vz']) check(finite(projectile[key], -100, 100), 'Invalid saved projectile position.');
    check(finite(projectile.damage, 0.01) && finite(projectile.speed, 0.01, 100) && finite(projectile.duration, 0.01, 10) && finite(projectile.age, 0, 5), 'Invalid saved projectile lifetime.');
  }
  for (const entry of data.queue) check(object(entry) && Object.hasOwn(ENEMY_TYPES, entry.type) && finite(entry.delay, 0.01, 10) && integer(entry.ordinal, 1, 128), 'Invalid saved spawn queue.');
  for (const action of [...data.undo, ...data.redo]) {
    check(object(action) && ['place', 'upgrade', 'sell'].includes(action.kind) && knownId(action.id) && Number.isSafeInteger(action.coinDelta), 'Invalid saved decision.');
    check((action.kind === 'place' && action.before === null && object(action.after)) || (action.kind === 'sell' && object(action.before) && action.after === null) || (action.kind === 'upgrade' && object(action.before) && object(action.after)), 'Invalid saved decision snapshots.');
    for (const tower of [action.before, action.after]) if (tower) { towerValid(tower); check(tower.id === action.id, 'Decision ID does not match its tower.'); }
    const expectedDelta = action.kind === 'place' ? -action.after.invested : action.kind === 'sell' ? Math.floor(action.before.invested * 0.7) : action.before.invested - action.after.invested;
    check(action.coinDelta === expectedDelta, 'Invalid saved decision economy.');
    if (action.runtime !== undefined) {
      const runtime = action.runtime;
      check(object(runtime) && finite(runtime.cooldownReadyAt, 0, data.time + 20) && ['first', 'last', 'strongest', 'weakest'].includes(runtime.mode), 'Invalid saved decision cooldown.');
      check((runtime.firedAt === undefined || finite(runtime.firedAt, 0, data.time)) && (runtime.targetId === undefined || knownId(runtime.targetId)), 'Invalid saved decision targeting.');
    }
  }
  const recordIds = new Set();
  for (const record of data.history) {
    check(validHistoryRecord(record) && record.id <= data.recordId && !recordIds.has(record.id), 'Invalid saved wave history.'); recordIds.add(record.id);
  }
  check(object(data.waveStats), 'Invalid saved wave statistics.');
  for (const key of ['kills', 'leaked', 'damage', 'coins', 'started']) check(finite(data.waveStats[key]), 'Invalid saved wave statistics.');
  return { data, grid };
}

export function validHistoryRecord(record) {
  return object(record) && integer(record.id, 1) && integer(record.run, 1) && integer(record.wave, 1, 10) && integer(record.kills) && integer(record.leaked) && integer(record.damage) && integer(record.earned) && integer(record.health, 0, 100) && finite(record.duration) && (record.difficulty === undefined || (Number.isInteger(record.difficulty) && Object.hasOwn(DIFFICULTIES, record.difficulty)));
}
