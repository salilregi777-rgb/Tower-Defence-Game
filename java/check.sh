#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p out
find src -name '*.java' -print > .sources
javac -encoding UTF-8 -d out @.sources
java -cp out sylva.SelfCheck
