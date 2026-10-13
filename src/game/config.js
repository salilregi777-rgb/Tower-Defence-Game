import { BinaryTree } from '../dsa/structures.js';

export const DEFAULT_DIFFICULTY = 3;
// Multipliers are applied once when a wave is queued or an enemy is created.
// Seeds are earned through play; difficulty never requires a purchase.
export const DIFFICULTIES = Object.freeze(Object.fromEntries([
  { value: 1, name: 'Gentle', label: 'Gentle', description: 'A little room to learn. Build, experiment, and protect the grove.', hp: 0.9, speed: 0.95, spawn: 1.12, count: 1, reward: 1.1 },
  { value: 2, name: 'Guarded', label: 'Guarded', description: 'A steady challenge. Grow new defenses as the blight gathers.', hp: 1.1, speed: 1, spawn: 1, count: 1, reward: 1.05 },
  { value: 3, name: 'Resolute', label: 'Resolute', description: 'The intended challenge. Reinvest your seeds and upgrade your defenses.', hp: 1.35, speed: 1.04, spawn: 0.9, count: 1, reward: 1 },
  { value: 4, name: 'Relentless', label: 'Relentless', description: 'Hardier invaders arrive in greater numbers. Every seed matters.', hp: 1.7, speed: 1.09, spawn: 0.82, count: 1.1, reward: 0.93 },
  { value: 5, name: 'Siege', label: 'Siege', description: 'The forest is under siege. Plan your positions, timing, and upgrades.', hp: 2.2, speed: 1.14, spawn: 0.74, count: 1.2, reward: 0.85 },
].map(profile => [profile.value, Object.freeze(profile)])));

export const TOWER_TYPES = Object.freeze({
  archer: { name: 'Thornspire', subtitle: 'Archer', cost: 55, damage: 18, range: 3.8, interval: 0.58, color: '#cadf93', description: 'Fast living thorns seek a single invader. Long reach, precise damage.' },
  cannon: { name: 'Rootbreaker', subtitle: 'Cannon', cost: 105, damage: 62, range: 3.25, interval: 1.8, color: '#e6bb7f', description: 'Lobs seedpods in a high arc. Explosions damage every enemy nearby.' },
  frost: { name: 'Winterbloom', subtitle: 'Frost', cost: 80, damage: 12, range: 3.3, interval: 0.88, color: '#a9d8e0', description: 'Crystalline spores chill invaders, reducing their movement by 45%.' },
  lightning: { name: 'Stormwillow', subtitle: 'Lightning', cost: 140, damage: 34, range: 3.5, interval: 1.18, color: '#d1c1ec', description: 'Living electricity arcs between three invaders. Excels against groups.' },
});

export const ENEMY_TYPES = Object.freeze({
  basic: { name: 'Blightling', hp: 46, speed: 1.22, reward: 9, baseDamage: 5, color: '#bfa47d', size: 0.25 },
  runner: { name: 'Skitter', hp: 31, speed: 2.05, reward: 10, baseDamage: 6, color: '#dcb893', size: 0.2 },
  tank: { name: 'Ironbark', hp: 168, speed: 0.76, reward: 22, baseDamage: 12, color: '#a99583', size: 0.38 },
  resistant: { name: 'Ashveil', hp: 92, speed: 1.11, reward: 16, baseDamage: 9, color: '#b3a6c5', size: 0.29, resistance: 'frost/lightning' },
  boss: { name: 'The Hollow', hp: 1000, speed: 0.59, reward: 120, baseDamage: 35, color: '#ba8276', size: 0.62 },
});

function node(id, name, cost, description, modifiers, left = null, right = null) { return { id, name, cost, description, modifiers, left, right }; }
export function createUpgradeTrees() {
  const result = {};
  for (const [type, stats] of Object.entries(TOWER_TYPES)) {
    const c = Math.round(stats.cost * 0.85);
    result[type] = new BinaryTree(node('root', stats.name, 0, stats.description, {},
      node('power', 'Deep roots', c, '+65% damage, +0.25 reach', { damage: 1.65, range: 0.25 },
        node('power-force', 'Ancient force', Math.round(c * 1.6), '+80% damage', { damage: 1.8 }),
        node('power-reach', 'Canopy reach', Math.round(c * 1.45), '+1.6 reach, +20% damage', { range: 1.6, damage: 1.2 })),
      node('speed', 'Wild growth', c, 'Attack 35% faster', { interval: 0.65 },
        node('speed-rapid', 'Quickening', Math.round(c * 1.5), 'Attack 40% faster', { interval: 0.6 }),
        node('speed-multi', type === 'lightning' ? 'Storm network' : 'Abundance', Math.round(c * 1.65), type === 'lightning' ? 'Chain to 5 enemies, +25% damage' : 'Fire two projectiles, +15% damage', { multishot: 2, chain: 5, damage: type === 'lightning' ? 1.25 : 1.15 })),
    ));
  }
  return result;
}

export function generateWave(wave, difficulty = DEFAULT_DIFFICULTY) {
  const profile = DIFFICULTIES[difficulty] || DIFFICULTIES[DEFAULT_DIFFICULTY];
  const entries = [], count = Math.round((6 + wave * 3) * profile.count);
  for (let i = 0; i < count; i++) {
    let type = 'basic';
    if (wave >= 2 && i % 4 === 2) type = 'runner';
    if (wave >= 3 && i % 6 === 4) type = 'tank';
    if (wave >= 4 && i % 5 === 3) type = 'resistant';
    entries.push({ type, delay: Math.max(0.38, 0.95 - wave * 0.045) * profile.spawn, ordinal: i + 1 });
  }
  if (wave % 5 === 0) entries.splice(Math.floor(entries.length * 0.65), 0, { type: 'boss', delay: 1.6 * profile.spawn, ordinal: count + 1 });
  return entries;
}

export function createBattlefield() {
  const grid = Array.from({ length: 13 }, () => Array(17).fill('build'));
  const waypoints = [[0, 5], [3, 5], [3, 9], [8, 9], [8, 2], [13, 2], [13, 6], [16, 6]];
  for (let i = 1; i < waypoints.length; i++) {
    let [col, row] = waypoints[i - 1]; const [endCol, endRow] = waypoints[i];
    grid[row][col] = 'path';
    while (col !== endCol || row !== endRow) { col += Math.sign(endCol - col); row += Math.sign(endRow - row); grid[row][col] = 'path'; }
  }
  for (const [col, row] of [[0, 0], [1, 0], [5, 1], [6, 1], [15, 0], [16, 0], [0, 11], [1, 12], [5, 12], [10, 12], [11, 11], [16, 11], [15, 12], [0, 8], [12, 9], [14, 9], [11, 5]]) grid[row][col] = 'obstacle';
  return grid;
}
