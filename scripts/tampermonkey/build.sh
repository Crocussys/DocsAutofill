#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/../../src"
OUTPUT_DIR="$SCRIPT_DIR/dist"
VERSION=""

while [ "$#" -gt 0 ]; do
    case "$1" in
        --source-dir)
            SOURCE_DIR="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"
mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"

if [ -z "$VERSION" ]; then
    MANIFEST_PATH="$SOURCE_DIR/manifest.json"
    if [ ! -f "$MANIFEST_PATH" ]; then
        echo "manifest.json not found in SourceDir: $SOURCE_DIR" >&2
        exit 1
    fi
    VERSION="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$MANIFEST_PATH" | head -n1)"
    if [ -z "$VERSION" ]; then
        echo "Failed to parse version from: $MANIFEST_PATH" >&2
        exit 1
    fi
fi

to_file_uri() {
    local path="$1"
    local encoded="${path// /%20}"
    printf 'file://%s' "$encoded"
}

build_userscript() {
    local name="$1"
    local description="$2"
    local match="$3"
    local output_file="$4"
    shift 4
    local requires=("$@")

    {
        echo "// ==UserScript=="
        echo "// @name         $name"
        echo "// @namespace    https://tampermonkey.net/"
        echo "// @version      $VERSION"
        echo "// @description  $description"
        echo "// @author       DocsAutofill"
        echo "// @match        $match"
        for req in "${requires[@]}"; do
            echo "// @require      $(to_file_uri "$SOURCE_DIR/$req")"
        done
        echo "// @run-at       document-idle"
        echo "// @grant        none"
        echo "// ==/UserScript=="
        echo
        echo "// Entrypoint is intentionally empty: all logic is loaded via @require."
    } > "$output_file"
}

build_userscript \
    "DocsAutofill (Beer)" \
    "Autofill documents for beer.crpt.ru" \
    "https://beer.crpt.ru/requests/connect-tap/create*" \
    "$OUTPUT_DIR/docsautofill-beer.user.js" \
    "config.js" \
    "libs/xlsx.full.min.js" \
    "utils/notifications.js" \
    "utils/react.js" \
    "utils/clipboard.js" \
    "utils/buttons.js" \
    "utils/init_message.js" \
    "pages/beer.js"

build_userscript \
    "DocsAutofill (Milk)" \
    "Autofill documents for milk.crpt.ru" \
    "https://milk.crpt.ru/*" \
    "$OUTPUT_DIR/docsautofill-milk.user.js" \
    "config.js" \
    "utils/notifications.js" \
    "utils/react.js" \
    "utils/clipboard.js" \
    "utils/buttons.js" \
    "utils/init_message.js" \
    "pages/cheese.js"

echo "Generated:"
echo " - $OUTPUT_DIR/docsautofill-beer.user.js"
echo " - $OUTPUT_DIR/docsautofill-milk.user.js"
