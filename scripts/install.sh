#!/usr/bin/env bash
set -e

TARGET_DIR="$HOME/.config/DocsAutofill"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"

if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
fi

mkdir -p "$TARGET_DIR"
cp -a "$SRC_DIR/." "$TARGET_DIR/"
echo "Done."
