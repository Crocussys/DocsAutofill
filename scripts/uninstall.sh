#!/usr/bin/env bash
set -e

TARGET_DIR="$HOME/.config/DocsAutofill"

if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
fi

echo "Cleaned."
