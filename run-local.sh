#!/bin/sh
set -eu
cd "$(dirname "$0")/java"
exec ./run-backend.sh "${PORT_JAVA:-5174}"
