#!/bin/sh
# Starts LabsCode (Lite or full) from this folder. Settings and extensions stay in LabsCode/data (portable).
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/LabsCode/code-oss" "$@" >/dev/null 2>&1 &
