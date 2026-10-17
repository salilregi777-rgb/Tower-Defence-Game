const ok = message => ({ ok: true, message });

/** Browser-side view model only. All simulation and DSA mutations run in Java. */
export class JavaGameEngine {
  constructor() {
    this._state = { difficulty: 3, health: 100, coins: 200, wave: 1, phase: 'ready', paused: true, speed: 1, time: 0, towers: [], enemies: [], projectiles: [], queue: [], path: [], grid: [], history: [], selectedTowerId: null, undoCount: 0, redoCount: 0, waveTotal: 0 };
    this._inspector = { queue: [], queueMeta: { head: 0, tail: 0, capacity: 128, size: 0 }, linkedList: [], heap: [], bst: null, bstOrdered: [], undo: [], redo: [], history: [], btreeSplits: 0, operations: [], upgrades: [], bfs: { path: [], order: [], visited: [], grid: [], steps: 0 } };
    this._effects = []; this._previous = null; this._stateReceivedAt = performance.now(); this.connected = false; this.inspectorVisible = false; this._inspectorRequest = null;
    this.undoStack = { get size() { return engine.undoCount; }, isEmpty: () => engine.undoCount === 0 };
    this.redoStack = { get size() { return engine.redoCount; }, isEmpty: () => engine.redoCount === 0 };
    this.spawnQueue = { get size() { return engine._state.queueSize || 0; } };
    this.projectiles = { toArray: () => engine._state.projectiles };
    const engine = this;
    this.ready = this.refresh(); this.timer = setInterval(() => this.refresh(), 50);
    this.inspectorTimer = setInterval(() => { if (this.inspectorVisible) void this.refreshInspector(); }, 220);
  }
  async refresh() {
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Java backend returned ${response.status}`);
      const packet = await response.json(), next = packet.state;
      if (this._previous) this.captureEffects(this._previous, next);
      this._state = next; if (packet.inspector) this._inspector = packet.inspector; this._previous = next; this._stateReceivedAt = performance.now(); this.connected = true;
    } catch (error) { this.connected = false; if (!this._reported) { console.error('SYLVA Java backend:', error); this._reported = true; } }
  }
  setInspectorVisible(value) { this.inspectorVisible = Boolean(value); if (this.inspectorVisible) void this.refreshInspector(); }
  async refreshInspector() {
    if (this._inspectorRequest) return this._inspectorRequest;
    this._inspectorRequest = (async () => {
      try { const response = await fetch('/api/inspector', { cache: 'no-store' }); if (response.ok) this._inspector = await response.json(); }
      catch { /* A delayed inspector refresh should never interrupt the game. */ }
      finally { this._inspectorRequest = null; }
    })();
    return this._inspectorRequest;
  }
  captureEffects(previous, next) {
    if (next.effects?.length) { this._effects.push(...next.effects); if (this._effects.length > 250) this._effects.splice(0, this._effects.length - 250); return; }
    const oldTowers = new Set(previous.towers.map(x => x.id)), oldEnemies = new Set(previous.enemies.map(x => x.id));
    for (const tower of next.towers) if (!oldTowers.has(tower.id)) this._effects.push({ type: 'placement', ...tower, time: next.time });
    for (const enemy of next.enemies) if (!oldEnemies.has(enemy.id)) this._effects.push({ type: 'spawn', enemyType: enemy.type, ...enemy, time: next.time });
    const live = new Set(next.enemies.map(x => x.id));
    for (const enemy of previous.enemies) if (!live.has(enemy.id)) this._effects.push({ type: 'death', enemyId: enemy.id, enemyType: enemy.type, x: enemy.x, z: enemy.z, time: next.time });
    if (this._effects.length > 250) this._effects.splice(0, this._effects.length - 250);
  }
  send(action, fields = {}) {
    void this.request(action, fields);
    return ok(({ place: 'Guardian planted.', upgrade: 'Growth branch chosen.', sell: 'Guardian returned to the earth.', wave: 'The wave has begun.', restart: 'A new grove awaits.', save: 'Grove saved on this device.', load: 'Loading your saved grove.' })[action] || 'The grove responds.');
  }
  async request(action, fields = {}) {
    try {
      const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...fields }) });
      const packet = await response.json(); if (packet.state) { if (this._previous) this.captureEffects(this._previous, packet.state); this._state = packet.state; this._inspector = packet.inspector; this._previous = packet.state; this._stateReceivedAt = performance.now(); this.connected = true; }
      if (!packet.ok) window.dispatchEvent(new CustomEvent('sylva-backend-message', { detail: packet.message }));
      return packet;
    } catch (error) { console.error('SYLVA Java backend:', error); this.connected = false; window.dispatchEvent(new CustomEvent('sylva-backend-message', { detail: 'The Java backend is not connected. Restart it, then reload the grove.' })); return { ok: false, message: 'Start the Java backend, then reload the grove.' }; }
  }
  get difficulty() { return this._state.difficulty; }
  get health() { return this._state.health; }
  get coins() { return this._state.coins; }
  get wave() { return this._state.wave; }
  get phase() { return this._state.phase; }
  get speed() { return this._state.speed; }
  /** Wall-clock time since Java's last authoritative snapshot, for 60 Hz visual extrapolation. */
  get presentationDelta() { return Math.min(.12, Math.max(0, (performance.now() - this._stateReceivedAt) / 1000)) * (this.speed || 1); }
  get time() { return this._state.time; }
  get towers() { return this._state.towers; }
  get enemies() { return this._state.enemies; }
  get path() { return this._state.path; }
  get grid() { return this._state.grid; }
  get selectedTowerId() { return this._state.selectedTowerId; }
  getUpgradeBranchName() { return this._state.upgradeBranchName || 'Living grove'; }
  get waveTotal() { return this._state.waveTotal; }
  get totalKills() { return this._state.totalKills || 0; }
  get waveStats() { return { kills: this._state.waveKills || 0, leaked: this._state.waveLeaked || 0, damage: this._state.waveDamage || 0 }; }
  get undoCount() { return this._state.undoCount || 0; }
  get redoCount() { return this._state.redoCount || 0; }
  get paused() { return this._state.paused; }
  set paused(value) { this._state.paused = Boolean(value); void this.send('pause', { value: Boolean(value) }); }
  getTower(id = this.selectedTowerId) { return this.towers.find(tower => tower.id === id); }
  canPlace(type, col, row) { return Boolean(this._state.grid[row]?.[col] === 'build' && this.coins >= ({ archer: 55, cannon: 105, frost: 80, lightning: 140 }[type] || Infinity) && !['victory', 'defeat'].includes(this.phase)); }
  selectTower(id) { return this.send('select', { id: id ?? -1 }); }
  place(type, col, row) { return this.send('place', { type, col, row }); }
  upgrade(id, branch) { return this.send('upgrade', { id, branch }); }
  sell() { return this.send('sell'); }
  undo() { return this.send('undo'); }
  redo() { return this.send('redo'); }
  setTargetMode(id, mode) { return this.send('target', { id, mode }); }
  setDifficulty(value) { this._state.difficulty = value; return this.send('difficulty', { value }); }
  startWave() { return this.send('wave'); }
  togglePause() { return this.send('pause'); }
  cycleSpeed() { return this.send('speed'); }
  restart() { return this.send('restart'); }
  save() { return this.send('save'); }
  load() { return this.send('load'); }
  async searchHistory(id) { const packet = await this.request('history-search', { id }); return packet.record || null; }
  update() {}
  getUpgradeOptions(id = this.selectedTowerId) { return id === this.selectedTowerId ? this._inspector.upgrades || [] : []; }
  drainEffects() { const events = this._effects; this._effects = []; return events; }
  inspector() { return this._inspector; }
  log(structure, operation, complexity, explanation, nodes = []) { void this.send('log', { structure, operation, complexity, explanation, nodes }); }
}
