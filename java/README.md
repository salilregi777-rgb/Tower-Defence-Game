# SYLVA Java backend

The Java service owns the live game simulation and DSA structures. The browser UI remains the existing JavaScript/Three.js application. A JDK-only HTTP server serves the browser assets and its JSON API from the same local origin.

## Run

From the repository root, run `./run-local.sh`, or `npm run dev` if Node/npm is installed. Then open `http://127.0.0.1:5174` and keep the terminal open. Requires JDK 21+.

To run only the Java service, use `./run-backend.sh`. Run the DSA and campaign checks with `./check.sh`.

`src/sylva/server/GameServer.java` exposes the local API, `src/sylva/model/GameEngine.java` owns simulation rules, and `src/sylva/dsa/` contains the active queue, stack, linked-list, heap, search-tree, binary-tree, B-tree, and BFS implementations. `docs/DSA.md` explains them.
