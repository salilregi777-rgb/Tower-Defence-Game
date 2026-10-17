#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p out dist/input
find src -name '*.java' -print > .sources
javac -encoding UTF-8 -d out @.sources
jar --create --file dist/input/sylva.jar --main-class sylva.Main -C out .
rm -rf dist/SYLVA.app
jpackage --type app-image --name SYLVA --input dist/input --main-jar sylva.jar --main-class sylva.Main --dest dist --vendor SYLVA --description "Defend the living grove" --app-version 1.0
printf 'Created %s/dist/SYLVA.app\n' "$PWD"
