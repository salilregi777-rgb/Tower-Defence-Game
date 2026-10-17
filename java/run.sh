#!/bin/sh
set -eu
exec "$(dirname "$0")/run-backend.sh" "$@"
