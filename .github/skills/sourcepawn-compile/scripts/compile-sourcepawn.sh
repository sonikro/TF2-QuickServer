#!/usr/bin/env bash
set -euo pipefail

SPCOMP="/home/node/sourcemodAPI/addons/sourcemod/scripting/spcomp"
INCLUDE_DIR="/home/node/sourcemodAPI/addons/sourcemod/scripting/include/"
PLUGINS_DIR="variants/base/tf/addons/sourcemod/plugins"

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <source.sp> [output-name.smx]" >&2
  exit 2
fi

SRC="$1"
OUT_NAME="${2:-}"

if [[ ! -x "$SPCOMP" ]]; then
  chmod +x "$SPCOMP" 2>/dev/null || true
fi

if [[ ! -f "$SRC" ]]; then
  echo "Source file not found: $SRC" >&2
  exit 2
fi

if [[ -n "$OUT_NAME" ]]; then
  OUT_NAME="$(basename "$OUT_NAME")"
fi

if [[ -z "$OUT_NAME" ]]; then
  BASE_NAME="$(basename "$SRC")"
  BASE_NAME="${BASE_NAME%.sp}"
  OUT_NAME="${BASE_NAME}.smx"
fi

mkdir -p "$PLUGINS_DIR"
OUT_PATH="$PLUGINS_DIR/$OUT_NAME"

"$SPCOMP" "$SRC" -i "$INCLUDE_DIR" -o "$OUT_PATH"
echo "Compiled: $OUT_PATH"
