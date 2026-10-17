# SYLVA: Data structures and algorithms in the running game

SYLVA's simulation and data structures run in the Java backend. The JavaScript/Three.js layer only draws the world and forwards player input. The **Structure inspector** reads live snapshots from the Java service. Complexity uses `n` for the number of items, `h` for tree height, `V` and `E` for grid vertices and edges, and `k` for targets in range.

## Route search — breadth-first search

The forest is a grid graph. Each walkable tile is a vertex, and each legal neighboring move is an edge. Breadth-first search uses a FIFO queue to visit tiles in layers from the entrance. The first visit to the heart gives a shortest route when every move has equal cost. Predecessor links reconstruct that route.

**Time:** `O(V + E)` · **Space:** `O(V)`

## Incoming wave — circular queue

Enemy specifications wait in a fixed-capacity circular queue. A head and tail index wrap to the beginning of the array, so removing the next invader and adding an item take constant time without shifting all remaining items.

**Offer / poll:** `O(1)` · **Space:** `O(C)` for capacity `C`

## Guardian targeting — max heap

Each tower scans enemies in range, builds a priority heap using its target rule, then extracts the highest-priority enemy. The same heap supports First, Last, Strongest, and Weakest targeting. This implementation favors clear per-shot selection over maintaining a separate heap as every moving enemy changes position.

**Build from candidates:** `O(k)` · **Extract:** `O(log k)` · **Space:** `O(k)`

## Live-enemy lookup — binary search tree

Live invaders are indexed by unique integer ID. Projectiles use the index to find their target; defeated enemies are removed. This avoids searching the full enemy list for each homing projectile. The tree is unbalanced, so its operations are `O(h)` and can degrade to `O(n)` in the worst case.

## Projectiles — singly linked list

New shots append to a linked list. One traversal advances every projectile and unlinks shots that hit or expire. Appending at the tail is `O(1)`; updating and removing expired projectiles in a frame is `O(P)` for `P` active projectiles.

## Undo and redo — stacks

Build decisions store the before and after state, plus only their own seed change. Undo pops the newest decision and pushes it onto redo; redo reverses that operation. This is LIFO order and keeps unrelated combat rewards intact.

**Push / pop / peek:** `O(1)`

## Guardian growth — binary tree

The upgrade choices form an authored binary tree. The selected node identifies the current branch, and only its child choices are offered. The inspector demonstrates a depth-first lookup; the game stores the chosen node on the guardian.

**Lookup:** `O(u)` worst case for `u` authored upgrade nodes · **Space:** `O(u)`

## Campaign journal — B-tree

Completed waves are indexed by record number in a minimum-degree-2 B-tree. When a node fills, it splits and promotes its median key. Multiple keys per node keep the tree shallow and make ordered range traversal practical as the journal grows.

**Search / insert:** `O(log n)` with the B-tree's balanced height · **Space:** `O(n)`

## Fixed-step simulation

A Java scheduled clock supplies elapsed time to the engine. An accumulator runs deterministic `1/60`-second simulation steps and carries any fractional remainder forward. The browser receives snapshots for display while the server remains authoritative for movement and combat.

## Where to find the implementation

- `java/src/sylva/dsa/` contains the queue, stacks, list, heap, enemy index, upgrade tree, wave-history B-tree, and BFS.
- `java/src/sylva/model/GameEngine.java` connects those structures to the wave, combat, and economy rules.
- `java/src/sylva/server/GameServer.java` exposes state and operations to the browser inspector.
- `java/src/sylva/SelfCheck.java` checks data-structure edge cases and full-campaign behavior.
