#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p out
find src -name '*.java' -print > .sources
javac -encoding UTF-8 -d out @.sources
exec java -cp out sylva.server.GameServer "${PORT_JAVA:-5174}"
