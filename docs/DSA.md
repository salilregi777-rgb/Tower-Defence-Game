# Data structures in SYLVA

The simulation uses the hand-written implementations in `src/dsa/structures.js`. Open **Structures** during play to inspect the objects used by the live game. The inspector rebuilds the current targeting heap from the selected tower's actual range and priorities; it does not replay a separate demonstration.

| Structure | Gameplay use | Operations and complexity |
| --- | --- | --- |
| Circular queue | Pending enemies and BFS frontier | Fixed buffer with wrapping head/tail. Enqueue, dequeue and peek are O(1); wave initialization is O(n). Capacity is checked before insertion. |
| Stack | Undo and redo of placement, upgrade and sale decisions | Push/pop/peek are O(1). Applying a decision also locates/removes towers in an array, so the full action can be O(T). New decisions clear redo. |
| Singly linked list | Active projectiles | Tail insertion is O(1). Search/delete by ID are O(P). Every simulation step traverses once and unlinks expired or impacting nodes in O(1) per removal using the predecessor. |
| Max heap | Current tower targets | Custom comparators implement first, last, strongest and weakest. Insert/extract are O(log k). Range scanning plus repeated insertion makes rebuilding O(n + k log k), for n live enemies and k within range. |
| Binary search tree | Live enemies indexed by unique ID | Insert, search and delete are O(h). It is deliberately unbalanced: sequential IDs can give O(n), not a guaranteed O(log n). Projectiles retrieve the same live enemy objects stored by the simulation. |
| Binary tree | Each guardian's two-way upgrade branches | A depth-first lookup is O(u). A tower can select only a child of its current upgrade node. The current small trees have seven nodes each. |
| B-tree | Completed wave history | Minimum degree 2; nodes contain at most three keys. Full children split around a promoted median, and all leaves remain at the same depth. Search/insertion are O(log n) at fixed degree; ordered traversal is O(n). |
| Breadth-first search | Shortest orthogonal route across path tiles | O(V + E) time and O(V) storage. Uses the custom queue, a visited grid and predecessor grid. Towers cannot occupy the authored trail. |

## Simulation and undo

The renderer supplies real elapsed time. The engine accumulates it and advances at a fixed 1/60 second step, producing equivalent results at 30, 60 and 120 render FPS. Movement eases toward desired velocity, cannon seeds follow an arc, and frost modifies velocity rather than teleporting enemies.

Undo records tower decisions and a coin delta. It does not rewind combat or remove income earned from defeated enemies. Upgrade undo preserves the live tower object, targeting preference and attack cooldown. Sale undo restores the remaining cooldown after accounting for elapsed simulation time. A decision cannot be restored if its coin cost or tile occupancy is no longer valid.

## Difficulty and balance

Difficulty is an integer from 1 (Gentle) to 5 (Siege), with 3 (Resolute) as the default. Starting health remains 100 and starting seeds remain 200 at every setting. Seeds are earned only in the game. Reinvestment in new guardians and branching upgrades is the intended way to beat later waves.

| Difficulty | Enemy health | Movement speed | Spawn delay | Enemy count | Reward per enemy / wave bonus |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gentle | ×0.90 | ×0.95 | ×1.12 | ×1.00 | ×1.10 |
| Guarded | ×1.10 | ×1.00 | ×1.00 | ×1.00 | ×1.05 |
| Resolute | ×1.35 | ×1.04 | ×0.90 | ×1.00 | ×1.00 |
| Relentless | ×1.70 | ×1.09 | ×0.82 | ×1.10 | ×0.93 |
| Siege | ×2.20 | ×1.14 | ×0.74 | ×1.20 | ×0.85 |

Multipliers apply on top of wave scaling; counts, health and rewards are rounded. Difficulty can change only between waves. It is saved, retained on restart and recorded for each completed wave. Older saves lacking difficulty load at Resolute while preserving their serialized active enemy statistics and queue.

Balance regressions simulate a representative starter formation with no additional spending and a formation that reinvests earned rewards. The starter-only formation loses on wave 5 at Resolute and wave 3 at Siege. Reinvestment wins all ten waves at Resolute; the tested Siege strategy wins with 50 health. These are deterministic test strategies, not guarantees for every placement.

## Persistence and validation

Saves contain the pending queue, linked projectiles, live enemies, towers, coin deltas, timing state, random seed and completed wave history. Loading validates a detached copy and constructs replacement structures before changing the live engine. Invalid saves leave live object references and game state unchanged. History merges retain newer completed records already present on the device.

Run `node --test tests/*.test.js` to verify structure invariants, targeting, all guardian attacks, resistance, bosses, undo economics, atomic save/load, fixed-step equivalence, difficulty and complete campaigns. `tests/source.test.js` separately checks the preserved authored homepage and local assets.
