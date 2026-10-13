# SYLVA — Defend the Living World

A browser-local tower defense game built into the original Sylva Living Green environment. The homepage and battlefield share one Three.js renderer, frame loop, locally packaged Lexend typeface, botanical palette, and authored moss materials. No account, build dependencies, or remote asset requests are needed to play.

## Run

Requires Node.js 18 or newer:

```sh
node scripts/serve.mjs
```

Open http://127.0.0.1:5173. If Node is installed in the usual PATH, `npm run dev` is equivalent. To generate a portable static deployment, run `node scripts/build.mjs`; serve the resulting `dist/` directory from its root. Serve over HTTP rather than opening index.html as a file, because the game uses browser ES modules.

## Play

Click the circular Play button or Enter in the original dock. Choose a guardian, then click a buildable forest tile beside the winding trail. Start each wave when ready. Survive ten waves; the fifth and tenth include bosses. Select a planted tower to choose its upgrade branch, targeting priority, or sell it.

The animated **Challenge** slider has five levels: Gentle, Guarded, Resolute, Relentless, and Siege. Resolute is the default, with 35% more enemy health than the original balance. Higher settings also raise movement speed and spawn pressure and reduce rewards. Change difficulty between waves; it locks during combat and is included in saves. Spend the seeds earned from defeated enemies and completed waves on new guardians and upgrades. The tested starter-only formation loses by wave 5 on Resolute, while a strategy that reinvests its seeds can survive all ten waves.

- 1–4: choose Archer, Cannon, Frost, or Lightning
- Space: pause/resume
- Escape: clear placement/selection
- Command/Ctrl+Z: undo a player decision; Shift+Command/Ctrl+Z: redo
- Drag terrain: pan; wheel or +/−: zoom; reset: restore camera

Saved games and wave history stay in this browser's local storage. Save/load includes active enemies, projectiles, the pending wave queue, tower decisions, and fixed-step state. Audio starts muted and is synthesized after a user gesture. Changing browser or origin gives a separate save.

## Source organization

- `public/landing-pages/inner-green-3d.original.html`: byte-for-byte snapshot of the supplied public Sylva HTML
- `public/landing-pages/inner-green-3d.html`: the playable adaptation; original shader/geometry code retained
- `public/landing-pages/inner-green-assets/`: local Three.js, Lexend, and card imagery
- `scripts/adapt-source.py`: reproducible asset localization, copy changes, and shared-renderer integration hook
- `src/main.js`: homepage actions, cinematic camera journey, input and lifecycle coordination
- `src/rendering/game-scene.js`: battlefield, guardians, invaders, preview/range, particles and impacts
- `src/game/`: deterministic 60 Hz simulation, balance, upgrade branches, transactions and persistence
- `src/dsa/structures.js`: hand-written circular queue, stack, linked list, max heap, BST, binary tree, B-tree and BFS
- `src/ui/`: responsive HUD and inspector of the actual gameplay structures
- `src/audio.js`: procedural ambient/firing/impact sound
- `docs/DSA.md`: implementation and complexity notes for project explanation
- `tests/engine.test.js`: simulation and structure regression tests

## Verification

```sh
node --test tests/*.test.js
node scripts/build.mjs
```

The simulation suite covers all tower attacks, resistance and boss behavior, target comparators, branching upgrades, undo/redo economics, valid BFS paths, 30/60/120 FPS equivalence, deterministic save/load, ten-wave victory, defeat, restart, and B-tree split invariants.

The renderer adapts pixel density to frame time on capable devices; actual FPS depends on hardware, viewport size, and browser. Reduced-motion preferences shorten the camera journey and reduce decorative motion. Opening the field guide explains the game and its structures without leaving the living world.

## Attribution

Original **Sylva — Living Green** page, procedural moss, butterfly, shaders, liquid-metal controls, type and card assets: [ThreeUI / DesignCode](https://threeui.com/hero/sylva/living-green). The downloaded source hash and provenance are recorded in `public/landing-pages/source-manifest.json`. The preserved original is available for side-by-side regression review. Three.js retains its distributed copyright/license header.
