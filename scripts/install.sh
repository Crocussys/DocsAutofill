#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="$HOME/.config/DocsAutofill"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"
TM_BUILD_SCRIPT="$SCRIPT_DIR/tampermonkey/build.sh"
TAMPERS_DIR="$TARGET_DIR/tampers"

if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
fi

mkdir -p "$TARGET_DIR"
cp -a "$SRC_DIR/." "$TARGET_DIR/"

mkdir -p "$TAMPERS_DIR"
bash "$TM_BUILD_SCRIPT" --source-dir "$TARGET_DIR" --output-dir "$TAMPERS_DIR"

echo "Installed to: $TARGET_DIR"
echo "Tampermonkey scripts: $TAMPERS_DIR"
echo "Done."
