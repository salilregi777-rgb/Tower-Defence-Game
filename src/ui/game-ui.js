import { TOWER_TYPES } from '../game/engine.js';
import { DIFFICULTIES } from '../game/config.js';

const ICONS = {
  tree: '<path d="M12 21v-6m-5 1h10M12 3l-5 6h3l-5 6h14l-5-6h3z"/>',
  leaf: '<path d="M5 19c0-9 3-13 15-15 0 12-6 15-12 13m-3 3L16 9"/>',
  heart: '<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 3 11 8 15 5-4 13-10 8-15z"/>',
  seed: '<path d="M12 21V10M12 14C5 15 3 10 4 6c6 0 8 3 8 8zm0-4c0-6 4-8 8-8 1 5-3 9-8 8z"/>',
  wave: '<path d="M3 8c3-5 6 5 9 0s6 5 9 0M3 15c3-5 6 5 9 0s6 5 9 0"/>',
  play: '<path d="m9 5 10 7-10 7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  sound: '<path d="m4 9 4 0 5-4v14l-5-4H4zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="m3 9 4 0 5-4v14l-5-4H3zM17 9l5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',
  inspect: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M8 5h8M6 7v6l5 4m7-10v6l-5 4"/>',
  save: '<path d="M5 3h12l4 4v14H3V3zm2 0v6h9V3M7 21v-8h10v8"/>',
  load: '<path d="M3 7h7l2 3h10l-3 10H2V4h7l2 3h9v3"/>',
  undo: '<path d="m8 5-5 5 5 5M3 10h11c8 0 8 10 0 10"/>',
  redo: '<path d="m16 5 5 5-5 5m5-5H10c-8 0-8 10 0 10"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M4 8a9 9 0 1 1 0 8M4 3v6h6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
const ARTS = {
  archer: '<path d="M20 46V16m-5 31 5-8 5 8M19 20C9 13 7 7 11 3c10 3 14 9 9 17zm2 8c10-9 16-7 18-14-11-3-18 2-18 14zM16 29 7 24M17 34l-6 4M9 50h24"/><path d="M30 7c11 10 11 24 0 34m0-34v34M26 24h17m-4-4 4 4-4 4"/>',
  cannon: '<path d="M8 45c-3-9-2-16 4-21l7-4 12 3 8 9-2 13-15 6zM12 24l9 11 15-4M21 35l1 15M8 45l13-10M19 20 20 7l13-2 8 10-10 8M20 7l11 16M29 6l11 9"/><path d="M9 28C3 21 3 15 6 9c7 4 10 9 6 15m24 13 8-6"/>',
  frost: '<path d="M24 49V23m0 13-9-7m9 13 10-6M24 4v25M12 11l24 14M12 25l24-14M20 7l4 4 4-4m-8 19 4-4 4 4M14 12l1 6-6 1m26-7-1 6 6 1M14 25l1-6-6-1m26 7-1-6 6-1M13 48c1-8 6-8 11-3 4-8 12-6 14 3"/>',
  lightning: '<path d="M24 49V21M24 35l-9-11m9 17 11-15M12 45l12-6 13 7M12 20c-8 0-8-11 0-13 3-8 13-7 16-2 10-4 17 7 10 13-2 4-8 5-14 2-4 4-9 3-12 0z"/><path d="m24 6-7 10h8l-4 12 13-17h-9l5-7M8 22v10m30-11v13"/>',
};
const NAMES = { archer: 'Thorn Archer', cannon: 'Stone Mortar', frost: 'Frost Bloom', lightning: 'Storm Willow' };
const SHORT = { archer: 'Swift · precise', cannon: 'Area damage', frost: 'Slows invaders', lightning: 'Chain lightning' };
const STRUCTURES = {
  queue: { label: 'Queue', title: 'Enemy spawn queue', structure: 'Circular queue', complexity: 'O(1)', copy: 'A circular FIFO queue holds this wave’s remaining invaders. Dequeue removes the head; the indices wrap around the fixed buffer.' },
  list: { label: 'Linked list', title: 'Active projectiles', structure: 'Linked list', complexity: 'O(1) insert · O(n) search', copy: 'Each moving projectile is a linked node. Impacts remove nodes while traversal safely keeps the next pointer.' },
  heap: { label: 'Max heap', title: 'Target priority', structure: 'Max heap', complexity: 'O(k log k) rebuild', copy: 'Each attack rebuilds priorities from enemies currently in range. This live heap shows all current candidates and their real parent–child relationships. The root has the greatest priority for the selected targeting mode.' },
  bst: { label: 'Enemy BST', title: 'Living enemy index', structure: 'BST', complexity: 'O(h), worst O(n)', copy: 'Unique IDs index live enemy objects. Tracking projectiles search this tree. This is an ordinary unbalanced BST; sequential IDs can form a long branch.' },
  stacks: { label: 'Stacks', title: 'Decision memory', structure: 'Stack', complexity: 'O(1) push / pop', copy: 'Undo and redo store tower snapshots and coin changes. Only your decisions reverse; enemy movement and earned rewards continue independently.' },
  upgrade: { label: 'Upgrades', title: 'Branches of growth', structure: 'Binary tree', complexity: 'O(U) node lookup', copy: 'Every growth decision follows one child of the tower’s binary upgrade tree. The chosen node applies real damage, range, or attack-speed changes.' },
  btree: { label: 'B-tree', title: 'The grove’s memory', structure: 'B-tree', complexity: 'O(log n) search / insert', copy: 'Completed waves are indexed by record ID in a minimum-degree-2 B-tree. A full node splits, promoting its median key. Records persist on this device.' },
  bfs: { label: 'BFS + grid', title: 'A way through the forest', structure: 'BFS', complexity: 'O(V + E)', copy: 'Breadth-first search explores walkable cells using the circular queue. Predecessors reconstruct the actual route followed by every invader.' },
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => `<svg class="sg-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.leaf}</svg>`;
const art = type => `<svg class="sg-tower-art" viewBox="0 0 48 54" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ARTS[type]}</svg>`;
const node = (label, detail = '', active = false) => `<div class="sg-node${active ? ' is-active' : ''}">${escape(label)}${detail ? `<small>${escape(detail)}</small>` : ''}</div>`;
const empty = text => `<p class="sg-empty">${text}</p>`;

export function createGameUI(engine, callbacks = {}) {
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./game.css', import.meta.url).href; document.head.append(link);
  const root = document.createElement('div'); root.id = 'sylva-game-ui'; root.className = 'game-ui'; root.setAttribute('aria-label', 'Sylva game controls');
  root.innerHTML = `
    <header class="sg-topbar">
      <div class="sg-brand sg-glass"><button class="sg-home" data-action="home" title="Return to the grove" aria-label="Return to homepage">${icon('tree')}</button><div class="sg-brand-copy"><div class="sg-wordmark">SYLVA</div><div class="sg-world">THE LIVING GROVE</div></div></div>
      <div class="sg-counters sg-glass" aria-label="Grove status">
        <div class="sg-counter">${icon('heart')}<div><span class="sg-counter-label">Grove health</span><span class="sg-counter-value" data-value="health">100<small>/100</small></span></div></div>
        <div class="sg-counter">${icon('seed')}<div><span class="sg-counter-label">Seeds</span><span class="sg-counter-value" data-value="coins">200</span></div></div>
        <div class="sg-counter">${icon('wave')}<div><span class="sg-counter-label">Wave</span><span class="sg-counter-value" data-value="wave">01<small>/10</small></span></div></div>
      </div>
      <nav class="sg-tools sg-glass" aria-label="Game tools">
        <button class="sg-icon-button sg-inspector-toggle" data-action="inspector" aria-label="Open DSA inspector" aria-pressed="false" title="Live DSA inspector (I)">${icon('inspect')}<span>INSPECTOR</span></button>
        <button class="sg-icon-button sg-sound-tool" data-action="sound" aria-label="Enable sound" title="Sound off">${icon('mute')}</button>
        <button class="sg-icon-button sg-tool-secondary" data-action="save" aria-label="Save game" title="Save game">${icon('save')}</button>
        <button class="sg-icon-button sg-tool-secondary" data-action="load" aria-label="Load saved game" title="Load saved game">${icon('load')}</button>
        <button class="sg-icon-button sg-tool-secondary" data-action="help" aria-label="How to play" title="Field guide (H)">${icon('help')}</button>
        <button class="sg-icon-button sg-mobile-menu" data-action="menu" aria-label="Open game menu" title="Game menu">${icon('more')}</button>
      </nav>
    </header>
    <section class="sg-guidance" aria-label="Interactive tutorial"></section>
    <div class="sg-dock-wrap">
      <div class="sg-build-hint" hidden><span></span><button data-action="cancel-build" aria-label="Cancel tower placement">✕</button></div>
      <div class="sg-dock sg-glass" role="group" aria-label="Choose a living defense">
        ${Object.entries(TOWER_TYPES).map(([type, definition], index) => `<button class="sg-tower-button" data-tower="${type}" aria-label="Build ${NAMES[type]}, ${definition.cost} seeds" aria-pressed="false" title="${NAMES[type]} · ${definition.cost} seeds · ${definition.description}"><span class="sg-tower-key">${index + 1}</span>${art(type)}<span class="sg-tower-name">${NAMES[type]}</span><span class="sg-tower-meta"><span>${SHORT[type]}</span><span class="sg-tower-price">${definition.cost}</span></span></button>`).join('')}
      </div>
    </div>
    <div class="sg-history sg-glass" role="group" aria-label="Decision history"><button class="sg-icon-button" data-action="undo" title="Undo decision (Ctrl / ⌘ Z)" aria-label="Undo decision">${icon('undo')}<small data-value="undo">0</small></button><button class="sg-icon-button" data-action="redo" title="Redo decision (Ctrl / ⌘ Shift Z)" aria-label="Redo decision">${icon('redo')}<small data-value="redo">0</small></button></div>
    <div class="sg-camera sg-glass" role="group" aria-label="Camera"><button class="sg-icon-button" data-action="zoom-out" title="Zoom out" aria-label="Zoom out">${icon('minus')}</button><button class="sg-icon-button" data-action="zoom-in" title="Zoom in" aria-label="Zoom in">${icon('plus')}</button><button class="sg-icon-button" data-action="camera-reset" title="Reset camera" aria-label="Reset camera">${icon('reset')}</button></div>
    <section class="sg-wave-control sg-glass" aria-label="Wave controls">
      <div class="sg-difficulty">
        <div class="sg-difficulty-heading"><label for="sg-difficulty">THE CHALLENGE</label><output for="sg-difficulty" class="sg-difficulty-name" aria-live="polite">Resolute</output></div>
        <div class="sg-difficulty-range"><span class="sg-difficulty-ripple" aria-hidden="true"></span><input id="sg-difficulty" data-action="difficulty" type="range" min="1" max="5" step="1" value="3" aria-label="Game difficulty" aria-describedby="sg-difficulty-stats sg-difficulty-note" /></div>
        <div class="sg-difficulty-stops" aria-hidden="true">${Object.values(DIFFICULTIES).map(profile => `<span data-difficulty-stop="${profile.value}" title="${escape(profile.description)}">${escape(profile.label)}</span>`).join('')}</div>
        <div class="sg-difficulty-stats" id="sg-difficulty-stats"></div>
        <p class="sg-difficulty-note" id="sg-difficulty-note">Tune between waves</p>
      </div>
      <div class="sg-wave-heading"><span class="sg-wave-label">The forest is waiting</span><button class="sg-speed" data-action="speed" title="Cycle game speed" aria-label="Game speed">1×</button></div><div class="sg-wave-actions"><button class="sg-button sg-primary sg-wave-start" data-action="wave">${icon('play')}<span>Begin wave 01</span></button><button class="sg-icon-button sg-pause" data-action="pause" title="Pause (Space)" aria-label="Pause game">${icon('pause')}</button></div><div class="sg-progress"><span></span></div>
    </section>
    <section class="sg-selection sg-glass" aria-label="Selected tower" hidden></section>
    <aside class="sg-inspector sg-glass" aria-label="Live data structure inspector" hidden>
      <div class="sg-panel-top"><span class="sg-eyebrow">THE SYSTEM BENEATH</span><button class="sg-icon-button" data-action="inspector" aria-label="Close inspector">${icon('close')}</button></div><h2>A living architecture.</h2><p class="sg-inspector-intro">The actual structures tending this world.</p>
      <div class="sg-inspector-tabs" role="tablist" aria-label="Data structures">${Object.entries(STRUCTURES).map(([key, data]) => `<button role="tab" data-structure="${key}" aria-selected="${key === 'queue'}" aria-controls="sg-inspector-content">${data.label}</button>`).join('')}</div>
      <div class="sg-structure-body" id="sg-inspector-content" role="tabpanel"></div><div class="sg-inspector-footer"><span class="sg-live-dot"></span>LIVE FROM THE SIMULATION <span style="margin-left:auto" data-value="simulation-time">0.0s</span></div>
    </aside>
    <div class="sg-notice" role="status" aria-live="polite"></div>
    <div class="sg-overlay" hidden></div>`;
  document.body.append(root);
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  let visible = false, buildType = null, inspectorOpen = false, structure = 'queue', soundOn = false;
  let uiTime = 0, renderClock = 0, inspectorClock = 0, noticeUntil = 0, selectedFingerprint = '', tutorialFingerprint = '';
  let tutorialDismissed = false, modal = null, modalWasPaused = false, previousPhase = engine.phase, previousWave = engine.wave;
  let operationKey = '', bfsReplay = false, bfsProgress = 0, lastFocus = null, historySearchResult = '', disposed = false, difficultyFingerprint = '';
  const field = name => $(`[data-value="${name}"]`);
  function notify(message, seconds = 3) { if (!message) return; $('.sg-notice').textContent = message; $('.sg-notice').classList.add('is-visible'); noticeUntil = uiTime + seconds; }
  function result(action, quiet = false) { const response = action(); if (!quiet && response?.message) notify(response.message); selectedFingerprint = ''; render(); return response; }
  function setBuildType(type) { buildType = TOWER_TYPES[type] ? type : null; $$('.sg-tower-button').forEach(button => { const selected = button.dataset.tower === buildType; button.classList.toggle('is-armed', selected); button.setAttribute('aria-pressed', String(selected)); }); $('.sg-build-hint').hidden = !buildType; if (buildType) $('.sg-build-hint span').textContent = `Plant ${NAMES[buildType]} on open ground · Esc to cancel`; }
  function chooseTower(type) { if (buildType === type) type = null; setBuildType(type); callbacks.chooseTower?.(type); if (type) { engine.selectTower(null); selectedFingerprint = ''; } render(); }
  function toggleInspector() { inspectorOpen = !inspectorOpen; engine.setInspectorVisible?.(inspectorOpen); $('.sg-inspector').hidden = !inspectorOpen; $('.sg-inspector-toggle').setAttribute('aria-pressed', String(inspectorOpen)); $('.sg-inspector-toggle').setAttribute('aria-label', inspectorOpen ? 'Close DSA inspector' : 'Open DSA inspector'); $('.sg-guidance').style.visibility = inspectorOpen ? 'hidden' : ''; if (inspectorOpen) renderInspector(); }
  function renderTutorial() {
    const stage = engine.phase === 'wave' || engine.wave > 1 ? 2 : engine.towers.length ? 1 : 0;
    const fingerprint = `${stage}/${tutorialDismissed}/${engine.phase}`; if (fingerprint === tutorialFingerprint) return; tutorialFingerprint = fingerprint;
    const element = $('.sg-guidance'); element.hidden = tutorialDismissed || ['victory', 'defeat'].includes(engine.phase);
    const content = [
      ['01 / TAKE ROOT', 'Every forest starts<br>with a seed.', 'Choose a living defense below, then plant it on an open tile beside the winding path.'],
      ['02 / AWAKEN THE GROVE', 'Let nature<br>fight back.', 'Your defense has taken root. Begin the first wave when you’re ready. Grow more with the seeds you earn.'],
      ['03 / TEND YOUR WORLD', 'Watch the<br>forest awaken.', 'Select a planted defense to choose its growth and targeting. Protect the sacred tree through ten waves.'],
    ][stage];
    element.innerHTML = `<div class="sg-guidance-step">${content[0]}</div><h2>${content[1]}</h2><p>${content[2]}</p><button class="sg-dismiss" data-action="dismiss-tutorial">${stage === 2 ? 'I’VE GOT THIS' : 'HIDE FIELD NOTES'} ↗</button>`;
  }
  function renderSelection() {
    const tower = engine.getTower(); const panel = $('.sg-selection'); panel.hidden = !tower; root.classList.toggle('has-selection', Boolean(tower));
    if (!tower) { selectedFingerprint = ''; return; }
    const fingerprint = `${tower.id}/${tower.upgradeNode}/${tower.mode}/${engine.coins}`; if (fingerprint === selectedFingerprint || document.activeElement === panel.querySelector('select')) return; selectedFingerprint = fingerprint;
    const definition = TOWER_TYPES[tower.type], upgrades = engine.getUpgradeOptions(tower.id);
    panel.innerHTML = `<div class="sg-panel-top"><span class="sg-eyebrow">ROOTED · LEVEL ${tower.level}</span><button class="sg-icon-button" data-action="deselect" aria-label="Close tower details">${icon('close')}</button></div><h2>${NAMES[tower.type]}</h2><p class="sg-description">${escape(definition.description)}</p><div class="sg-stats"><div><strong>${Math.round(tower.stats.damage)}</strong><small>DAMAGE</small></div><div><strong>${(1 / tower.stats.interval).toFixed(1)}<span style="font-size:9px">/s</span></strong><small>ATTACKS</small></div><div><strong>${tower.stats.range.toFixed(1)}</strong><small>RANGE</small></div></div><label class="sg-target-row">Seek the <select data-action="target" aria-label="Tower targeting mode">${['first', 'last', 'strongest', 'weakest'].map(mode => `<option value="${mode}"${tower.mode === mode ? ' selected' : ''}>${mode[0].toUpperCase() + mode.slice(1)}</option>`).join('')}</select></label><div class="sg-upgrade-heading">CHOOSE YOUR GROWTH</div>${tower.upgradeNode !== 'root' ? `<div class="sg-branch-label">${escape(engine.getUpgradeBranchName() || tower.upgradeNode)} branch</div>` : ''}${upgrades.length ? upgrades.map(upgrade => `<button class="sg-upgrade" data-upgrade="${escape(upgrade.id)}"${engine.coins < upgrade.cost ? ' disabled' : ''}><span>${escape(upgrade.name)}<em>${upgrade.cost} seeds</em></span><small>${escape(upgrade.description)}</small></button>`).join('') : '<div class="sg-max-upgrade">Fully grown. The grove is stronger.</div>'}<button class="sg-sell" data-action="sell">Return to the earth · +${Math.floor(tower.invested * .7)} seeds</button>`;
  }
  function treeHTML(tree, kind, active, depth = 0, side = '', limit = { n: 0 }) {
    if (!tree) return '';
    if (++limit.n > 60 || depth > 15) return `<div class="sg-tree-node"><span>… ${kind === 'bst' ? 'deeper IDs' : 'more branches'} (scroll index below)</span></div>`;
    const label = kind === 'bst' ? `#${tree.id}` : tree.name || tree.id;
    const detail = kind === 'bst' ? `${tree.type} · ${tree.hp} hp` : tree.cost ? `${tree.cost} seeds` : 'root';
    return `<div class="sg-tree-node ${depth === 0 ? 'sg-tree-root' : ''}"><span>${side}</span>${node(label, detail, kind === 'bst' ? tree.id === active : tree.id === active)}${treeHTML(tree.left, kind, active, depth + 1, 'L', limit)}${treeHTML(tree.right, kind, active, depth + 1, 'R', limit)}</div>`;
  }
  function heapHTML(items, index = 0, side = '', depth = 0) { if (!items[index]) return ''; const entry = items[index]; if (depth > 4) return '<div class="sg-tree-node"><small>… further leaves</small></div>'; return `<div class="sg-tree-node ${index === 0 ? 'sg-tree-root' : ''}"><span>${side}</span>${node(`#${entry.id}`, `${Math.round(entry.hp)} hp · ${entry.progress.toFixed(1)} path`, index === 0)}${heapHTML(items, index * 2 + 1, 'L', depth + 1)}${heapHTML(items, index * 2 + 2, 'R', depth + 1)}</div>`; }
  function btreeHTML(tree, depth = 0) { if (!tree?.keys?.length) return empty('Complete a wave to grow the history index.'); return `<div class="sg-tree-node ${depth === 0 ? 'sg-tree-root' : ''}"><span>${tree.leaf ? 'LEAF' : 'NODE'}</span><div class="sg-nodes" style="display:inline-flex">${tree.keys.map(key => node(key, 'record')).join('')}</div>${tree.children.map(child => btreeHTML(child, depth + 1)).join('')}</div>`; }
  function drawStructure(snapshot) {
    if (structure === 'queue') return `<div class="sg-data-note" style="margin:0 0 10px">HEAD ${snapshot.queueMeta.head} · TAIL ${snapshot.queueMeta.tail} · ${snapshot.queue.length} / ${snapshot.queueMeta.capacity} slots</div><div class="sg-nodes">${snapshot.queue.length ? snapshot.queue.slice(0, 28).map((entry, index) => `${index ? '<span class="sg-node-arrow">→</span>' : ''}${node(entry.type, `#${entry.ordinal} · ${entry.delay.toFixed(1)}s`, index === 0)}`).join('') : empty('The queue is empty.<br>Begin a wave to enqueue its invaders.')}</div>${snapshot.queue.length > 28 ? `<div class="sg-data-note">+ ${snapshot.queue.length - 28} entries in the buffer</div>` : ''}`;
    if (structure === 'list') return `<div class="sg-data-note" style="margin:0 0 10px">HEAD → ${snapshot.linkedList.length} ACTIVE NODES → NULL</div><div class="sg-nodes">${snapshot.linkedList.length ? snapshot.linkedList.slice(0, 25).map((entry, index) => `${index ? '<span class="sg-node-arrow">→</span>' : ''}${node(`#${entry.id}`, `${entry.type} → #${entry.targetId}`)}`).join('') + '<span class="sg-node-arrow">→ ∅</span>' : empty('No projectiles in flight.<br>Watch these nodes appear as towers fire.')}</div>`;
    if (structure === 'heap') return `<div class="sg-data-note" style="margin:0 0 10px">TOWER ${snapshot.heapTowerId ? '#' + snapshot.heapTowerId : '—'} · ${escape(snapshot.heapMode || 'first').toUpperCase()}<br>NEXT TARGET ${snapshot.heapTargetId ? '#' + snapshot.heapTargetId : '—'} · LAST EXTRACTED ${snapshot.heapLastExtractedId ? '#' + snapshot.heapLastExtractedId : '—'}</div>${snapshot.heap.length ? heapHTML(snapshot.heap) : empty('No living invaders are currently in range.<br>The priority heap fills as enemies approach.')}`;
    if (structure === 'bst') return snapshot.bst ? `${treeHTML(snapshot.bst, 'bst', snapshot.heapTargetId)}<div class="sg-data-note">In-order traversal: ${snapshot.bstOrdered.map(id => '#' + id).join(' → ')}</div>` : empty('No living invaders to index.<br>Spawning inserts a node; death removes it.');
    if (structure === 'stacks') return `<div class="sg-stack-columns">${['undo', 'redo'].map(key => `<div class="sg-stack-column"><small>${key.toUpperCase()} · TOP ↓</small>${snapshot[key].length ? snapshot[key].slice(-12).reverse().map(entry => node(`${entry.kind} #${entry.id}`, `${entry.coinDelta > 0 ? '+' : ''}${entry.coinDelta} seeds`)).join('') : empty('∅ empty')}</div>`).join('')}</div>`;
    if (structure === 'upgrade') return snapshot.upgradeTree ? treeHTML(snapshot.upgradeTree, 'upgrade', snapshot.upgradeNode) : empty('Select a planted tower to inspect<br>its real upgrade tree.');
    if (structure === 'btree') return `${btreeHTML(snapshot.btree)}<div class="sg-data-note">${snapshot.history.length} persisted records · ${snapshot.btreeSplits} node splits</div>`;
    if (structure === 'bfs') {
      const data = snapshot.bfs, explored = new Set(data.order.slice(0, bfsReplay ? Math.floor(bfsProgress) : data.order.length).map(p => `${p.col},${p.row}`));
      const route = new Set((!bfsReplay || bfsProgress >= data.order.length ? data.path : []).map(p => `${p.col},${p.row}`));
      return `<div class="sg-grid" style="grid-template-columns:repeat(${data.grid[0].length},1fr)">${data.grid.map((row, r) => row.map((cell, c) => `<span class="sg-grid-cell ${cell === 'path' ? 'is-path' : cell === 'obstacle' ? 'is-obstacle' : cell === 'tower' ? 'is-tower' : ''} ${explored.has(`${c},${r}`) ? 'is-visited' : ''} ${route.has(`${c},${r}`) ? 'is-route' : ''}" title="(${c}, ${r}) ${cell}"></span>`).join('')).join('')}</div><div class="sg-data-note">${data.grid[0].length} × ${data.grid.length} array · ${Math.min(data.order.length, bfsReplay ? Math.floor(bfsProgress) : data.order.length)} visited · ${data.path.length} route cells<br>Ivory: route · moss: buildable · dark: obstacle · brass: tower</div>`;
    }
    return '';
  }
  function renderInspector() {
    if (!inspectorOpen) return;
    const snapshot = engine.inspector(), data = STRUCTURES[structure], body = $('.sg-structure-body');
    const events = snapshot.operations.filter(op => op.structure === data.structure);
    const event = operationKey ? events.find(op => `${op.time}/${op.operation}` === operationKey) : events.at(-1);
    const meta = event || data; const scroll = body.scrollTop; const input = $('#sg-record-id'); const focusedSearch = document.activeElement === input || document.activeElement?.matches('.sg-operation-select'); const searchValue = input?.value || '';
    // Keep a field being typed into stable; only the live diagram needs to change.
    if (focusedSearch) { const view = $('.sg-structure-view'); if (view) view.innerHTML = drawStructure(snapshot); return; }
    body.innerHTML = `<div class="sg-structure-meta"><span>${data.title}</span></div><p class="sg-algorithm-copy">${data.copy}</p><div class="sg-structure-view">${drawStructure(snapshot)}</div>${structure === 'bfs' ? `<button class="sg-button sg-bfs-play" data-action="bfs-replay">${icon('play')}${bfsReplay && bfsProgress < snapshot.bfs.order.length ? 'Exploring the recorded frontier…' : 'Replay BFS exploration'}</button>` : ''}${structure === 'btree' ? `<div class="sg-history-search"><input id="sg-record-id" type="number" min="1" placeholder="Record ID" aria-label="Wave record ID" value="${escape(searchValue)}"><button class="sg-button" data-action="history-search">Search</button></div><div class="sg-history-result">${escape(historySearchResult)}</div>` : ''}<div class="sg-data-note" style="margin-top:18px;margin-bottom:6px">INSPECT AN ACTUAL OPERATION</div><select class="sg-operation-select" aria-label="Select recorded data structure operation"><option value="">Latest ${events.length ? 'operation' : '— awaiting activity'}</option>${events.slice(-12).reverse().map(op => `<option value="${escape(op.time + '/' + op.operation)}"${operationKey === op.time + '/' + op.operation ? ' selected' : ''}>${op.time.toFixed(1)}s · ${escape(op.operation)}</option>`).join('')}</select><div class="sg-complexity">${escape(meta.complexity)}</div><p class="sg-algorithm-copy" style="margin-top:7px">${escape(event?.explanation || 'Perform an action to record its operation here.')}</p>${event?.nodes?.length ? `<div class="sg-data-note">Affected nodes: ${event.nodes.slice(0, 15).map(escape).join(' · ')}${event.nodes.length > 15 ? ' …' : ''}</div>` : ''}`;
    body.scrollTop = scroll;
    field('simulation-time').textContent = engine.time.toFixed(1) + 's';
  }
  function closeModal(resume = true) { if (!modal) return; $('.sg-overlay').hidden = true; $('.sg-overlay').innerHTML = ''; if (resume && !modalWasPaused && !['victory', 'defeat'].includes(engine.phase)) engine.paused = false; modal = null; lastFocus?.focus?.(); }
  function openModal(kind, refresh = false) {
    if (modal === kind && !refresh) return;
    if (!modal) { modalWasPaused = engine.paused; lastFocus = document.activeElement; }
    modal = kind; engine.paused = true;
    let content = '';
    if (kind === 'help') content = `<span class="sg-eyebrow">A FIELD GUIDE TO SYLVA</span><h2>A little care.<br>A living world.</h2><p>Invaders follow the pale forest path toward the sacred tree. Your grove has 100 health and ten waves to endure.</p>${[['Plant your defenses', 'Choose a defense below, then click open ground beside the path. The ghost and its ring show placement and range.'], ['Let nature fight back', 'Begin a wave. Towers attack automatically; defeated invaders return seeds. Every fifth wave brings a guardian-sized invader.'], ['Choose how you grow', 'Select a planted tower to upgrade, change targets, or sell. Undo and redo affect your building decisions. Open Inspector to watch the real algorithms.']].map((step, index) => `<div class="sg-help-step"><span>0${index + 1}</span><div><h3>${step[0]}</h3><p>${step[1]}</p></div></div>`).join('')}<div class="sg-shortcuts">1–4 choose defense · Esc cancel · Space pause · N next wave<br>I inspector · H field guide · Ctrl / ⌘ Z undo · Shift Z redo<br>Scroll to zoom · drag empty ground to pan · R reset camera</div><div class="sg-modal-actions"><button class="sg-button sg-primary" data-action="close-modal">Let’s grow ${icon('leaf')}</button></div>`;
    else if (kind === 'menu') content = `<span class="sg-eyebrow">A MOMENT IN THE GROVE</span><h2>The forest<br>can wait.</h2><p>Take a breath. Your world is paused.</p><div class="sg-modal-actions"><button class="sg-button sg-primary" data-action="resume">${icon('play')}Return to the grove</button><button class="sg-button" data-action="help">Field guide</button><button class="sg-button" data-action="save">${icon('save')}Save</button><button class="sg-button" data-action="load">${icon('load')}Load</button><button class="sg-button" data-action="sound">${icon(soundOn ? 'sound' : 'mute')}Sound ${soundOn ? 'on' : 'off'}</button><button class="sg-button" data-action="restart">${icon('reset')}Restart</button><button class="sg-button" data-action="home">Return home</button></div><div class="sg-shortcuts">Your saved grove stays on this device. Wave history is preserved across new games.</div>`;
    else { const won = kind === 'victory'; content = `${icon(won ? 'tree' : 'leaf', 'sg-end-icon')}<div class="sg-eyebrow">${won ? 'TEN WAVES. ONE LIVING WORLD.' : 'EVEN FORESTS BEGIN AGAIN.'}</div><h2>${won ? 'The wild<br>still belongs.' : 'A quiet<br>new beginning.'}</h2><p>${won ? 'The last invader has fallen. You tended a defense, and a whole world kept growing.' : 'The grove has fallen, but its roots remain. Try a new arrangement, combine slowing blooms with mortars, and let the forest rise again.'}</p><div class="sg-end-stats"><div><strong>${won ? 10 : Math.max(0, engine.wave - 1)}</strong><small>WAVES DEFENDED</small></div><div><strong>${engine.totalKills}</strong><small>INVADERS STOPPED</small></div><div><strong>${engine.towers.length}</strong><small>LIVING DEFENSES</small></div></div><div class="sg-modal-actions"><button class="sg-button sg-primary" data-action="restart">${icon('seed')}Grow a new world</button><button class="sg-button" data-action="home">Return home</button></div>`; }
    const overlay = $('.sg-overlay'); overlay.innerHTML = `<section class="sg-modal sg-glass" role="dialog" aria-modal="true" aria-label="${kind === 'menu' ? 'Game paused' : kind === 'help' ? 'How to play Sylva' : kind === 'victory' ? 'Victory' : 'Grove lost'}">${!['victory', 'defeat'].includes(kind) ? `<button class="sg-icon-button sg-modal-close" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button>` : ''}${content}</section>`; overlay.hidden = false; overlay.querySelector('button')?.focus();
  }
  function render() {
    field('health').innerHTML = `${Math.ceil(engine.health)}<small>/100</small>`; field('health').style.color = engine.health <= 25 ? '#e4b89b' : '';
    field('coins').textContent = Math.floor(engine.coins); field('wave').innerHTML = `${String(engine.wave).padStart(2, '0')}<small>/10</small>`;
    field('undo').textContent = engine.undoStack.size; field('redo').textContent = engine.redoStack.size;
    $('[data-action="undo"]').disabled = engine.undoStack.isEmpty(); $('[data-action="redo"]').disabled = engine.redoStack.isEmpty();
    $('.sg-speed').textContent = `${engine.speed}×`; $('.sg-speed').setAttribute('aria-label', `Game speed ${engine.speed} times; click to change`);
    const running = engine.phase === 'wave'; $('.sg-wave-label').textContent = running ? `${engine.enemies.length + engine.spawnQueue.size} invaders remain` : engine.wave % 5 === 0 ? 'A great shadow approaches' : 'The forest is waiting';
    $('.sg-wave-start span').textContent = running ? `Wave ${String(engine.wave).padStart(2, '0')} alive` : `Begin wave ${String(engine.wave).padStart(2, '0')}`; $('.sg-wave-start').disabled = engine.phase !== 'ready';
    $('.sg-pause').innerHTML = icon(engine.paused ? 'play' : 'pause'); $('.sg-pause').setAttribute('aria-label', engine.paused ? 'Resume game' : 'Pause game');
    $('.sg-progress span').style.width = `${running ? 100 * (1 - (engine.enemies.length + engine.spawnQueue.size) / Math.max(1, engine.waveTotal)) : 0}%`;
    renderDifficulty();
    $$('.sg-tower-button').forEach(button => { button.disabled = engine.coins < TOWER_TYPES[button.dataset.tower].cost || ['victory', 'defeat'].includes(engine.phase); });
    renderTutorial(); renderSelection();
    if (engine.wave !== previousWave && engine.phase === 'ready') notify(`Wave ${previousWave} survived. New seeds are ready to grow.`, 5);
    previousWave = engine.wave;
    if (['victory', 'defeat'].includes(engine.phase) && engine.phase !== previousPhase) openModal(engine.phase);
    previousPhase = engine.phase;
  }
  function renderDifficulty() {
    const profile = DIFFICULTIES[engine.difficulty], locked = engine.phase !== 'ready';
    const fingerprint = `${engine.difficulty}/${locked}`;
    if (fingerprint === difficultyFingerprint) return;
    difficultyFingerprint = fingerprint;
    const control = $('#sg-difficulty'), panel = $('.sg-difficulty');
    control.value = profile.value; control.disabled = locked;
    control.setAttribute('aria-valuetext', `${profile.value} of 5: ${profile.label}`);
    panel.style.setProperty('--difficulty-progress', `${(profile.value - 1) * 25}%`);
    panel.classList.toggle('is-locked', locked);
    $('.sg-difficulty-name').textContent = profile.label;
    $$('.sg-difficulty-stops span').forEach(stop => stop.classList.toggle('is-current', Number(stop.dataset.difficultyStop) === profile.value));
    const factor = value => `${Number(value.toFixed(2))}×`;
    $('.sg-difficulty-stats').innerHTML = `<span>Health <b>${factor(profile.hp)}</b></span><span>Speed <b>${factor(profile.speed)}</b></span><span>Spawn pace <b>${factor(1 / profile.spawn)}</b></span><span>Seeds <b>${factor(profile.reward)}</b></span>`;
    $('.sg-difficulty-stats').title = `${profile.description} Enemy count: ${factor(profile.count)}.`;
    $('.sg-difficulty-note').textContent = locked ? 'Locked until the wave ends' : 'Tune between waves · invest to endure';
  }
  function action(name) {
    if (name === 'home') { closeModal(true); callbacks.home?.(); }
    else if (name === 'wave') result(() => engine.startWave());
    else if (name === 'pause' || name === 'menu') { if (modal === 'menu') { closeModal(); engine.paused = false; } else openModal('menu'); }
    else if (name === 'resume') { closeModal(); engine.paused = false; }
    else if (name === 'speed') result(() => engine.cycleSpeed());
    else if (name === 'undo') result(() => engine.undo());
    else if (name === 'redo') result(() => engine.redo());
    else if (name === 'sell') result(() => engine.sell());
    else if (name === 'deselect') { engine.selectTower(null); callbacks.selectionChanged?.(null); }
    else if (name === 'cancel-build') chooseTower(null);
    else if (name === 'inspector') toggleInspector();
    else if (name === 'help') openModal('help');
    else if (name === 'close-modal') closeModal();
    else if (name === 'dismiss-tutorial') { tutorialDismissed = true; renderTutorial(); }
    else if (name === 'save') result(() => engine.save());
    else if (name === 'load') { const response = result(() => { const restored = engine.load(); if (restored.ok) previousWave = engine.wave; return restored; }); if (response?.ok) { closeModal(false); callbacks.onLoad?.(); setBuildType(null); callbacks.chooseTower?.(null); previousPhase = ''; } }
    else if (name === 'restart') { closeModal(false); result(() => engine.restart()); setBuildType(null); callbacks.chooseTower?.(null); callbacks.onRestart?.(); tutorialDismissed = false; tutorialFingerprint = ''; previousPhase = 'ready'; previousWave = 1; }
    else if (name === 'sound') {
      const applySoundState = value => { soundOn = typeof value === 'boolean' ? value : soundOn; const button = $('.sg-sound-tool'); button.innerHTML = icon(soundOn ? 'sound' : 'mute'); button.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound'); button.title = soundOn ? 'Sound on' : 'Sound off'; if (modal === 'menu') openModal('menu', true); notify(soundOn ? 'The sounds of the grove are on.' : 'A quieter grove.'); };
      soundOn = !soundOn; Promise.resolve(callbacks.sound?.(soundOn)).then(applySoundState).catch(() => { applySoundState(false); notify('Sound is unavailable in this browser.'); });
    }
    else if (name === 'camera-reset') callbacks.resetCamera?.();
    else if (name === 'zoom-in') callbacks.zoom?.(-1);
    else if (name === 'zoom-out') callbacks.zoom?.(1);
    else if (name === 'bfs-replay') { bfsReplay = true; bfsProgress = 0; renderInspector(); }
    else if (name === 'history-search') { const id = Number($('#sg-record-id')?.value); engine.searchHistory(id).then(record => { historySearchResult = record ? `Record ${record.id} · Wave ${record.wave} · ${record.kills} defeated · ${record.leaked} escaped · ${record.health} health · ${record.earned} seeds · ${record.duration}s` : `No completed wave record with ID ${id || '—'}.`; $('#sg-record-id')?.blur(); renderInspector(); }); }
    render();
  }
  const onClick = event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    if (button.dataset.tower) chooseTower(button.dataset.tower);
    else if (button.dataset.upgrade) result(() => engine.upgrade(engine.selectedTowerId, button.dataset.upgrade));
    else if (button.dataset.structure) { structure = button.dataset.structure; operationKey = ''; $$('.sg-inspector-tabs button').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.structure === structure))); $('.sg-structure-body').scrollTop = 0; renderInspector(); }
    else if (button.dataset.action) action(button.dataset.action);
  };
  function changeDifficulty(event) {
    if (event.target.dataset.action !== 'difficulty') return;
    const value = Number(event.target.value);
    if (value === engine.difficulty) return;
    const response = engine.setDifficulty(value);
    if (!response.ok) notify(response.message);
    difficultyFingerprint = ''; renderDifficulty();
  }
  const onChange = event => { if (event.target.dataset.action === 'difficulty') changeDifficulty(event); else if (event.target.dataset.action === 'target') result(() => engine.setTargetMode(engine.selectedTowerId, event.target.value)); else if (event.target.matches('.sg-operation-select')) { operationKey = event.target.value; event.target.blur(); renderInspector(); } };
  const onPointerDown = event => {
    if (event.target.id !== 'sg-difficulty' || event.target.disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.target.getBoundingClientRect(), ripple = $('.sg-difficulty-ripple');
    ripple.style.left = `${Math.max(12, Math.min(bounds.width - 12, event.clientX - bounds.left)) + 4}px`;
    ripple.getAnimations().forEach(animation => animation.cancel());
    ripple.animate([{ opacity: .6, transform: 'translate(-50%, -50%) scale(.6)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(2.2)' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
  };
  const onKey = event => {
    if (!visible || event.ctrlKey && event.key === 'r' || event.metaKey && event.key === 'r') return;
    if (modal && event.key === 'Tab') { const buttons = [...$('.sg-overlay').querySelectorAll('button:not(:disabled),input,select')]; if (!buttons.length) return; const first = buttons[0], last = buttons.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } return; }
    if (event.target.matches('input,select,textarea,[contenteditable]')) { if (event.key === 'Enter' && event.target.id === 'sg-record-id') action('history-search'); return; }
    if (event.key === 'Escape') { event.preventDefault(); if (modal && !['victory', 'defeat'].includes(modal)) closeModal(); else if (buildType) chooseTower(null); else if (inspectorOpen) toggleInspector(); else action('deselect'); return; }
    if (modal) { if (event.code === 'Space' && modal === 'menu') { event.preventDefault(); action('resume'); } return; }
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); action(event.shiftKey ? 'redo' : 'undo'); }
    else if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); action('redo'); }
    else if (event.ctrlKey || event.metaKey || event.altKey) return;
    else if (['1', '2', '3', '4'].includes(key)) { event.preventDefault(); const type = Object.keys(TOWER_TYPES)[Number(key) - 1]; if (engine.coins >= TOWER_TYPES[type].cost) chooseTower(type); else notify('The grove needs more seeds for this defense.'); }
    else if (event.code === 'Space') { event.preventDefault(); action('pause'); }
    else if (key === 'i') action('inspector'); else if (key === 'h') action('help'); else if (key === 'n') action('wave'); else if (key === 'r') action('camera-reset');
  };
  root.addEventListener('click', onClick); root.addEventListener('change', onChange); root.addEventListener('input', changeDifficulty); root.addEventListener('pointerdown', onPointerDown); document.addEventListener('keydown', onKey);
  render();
  return {
    root, notify, setBuildType,
    setVisible(value) { visible = Boolean(value); root.classList.toggle('is-visible', visible); root.setAttribute('aria-hidden', String(!visible)); root.inert = !visible; if (!visible) closeModal(true); else { render(); if (['victory', 'defeat'].includes(engine.phase)) openModal(engine.phase); } },
    update(dt = 0) { if (disposed) return; uiTime += dt; if (!visible) return; renderClock += dt; inspectorClock += dt; if (noticeUntil && uiTime >= noticeUntil) { $('.sg-notice').classList.remove('is-visible'); noticeUntil = 0; } if (bfsReplay) bfsProgress += dt * 12; if (renderClock > .12) { renderClock = 0; render(); } if (inspectorClock > .22) { inspectorClock = 0; renderInspector(); } },
    showHelp() { openModal('help'); },
    dispose() { disposed = true; document.removeEventListener('keydown', onKey); root.removeEventListener('click', onClick); root.removeEventListener('change', onChange); root.removeEventListener('input', changeDifficulty); root.removeEventListener('pointerdown', onPointerDown); root.remove(); link.remove(); },
  };
}
