#!/usr/bin/env bash
# Convert staged JPG/PNG images in docs/ to WebP.
# Removes the original, stages the WebP, then exits 1
# so the user re-runs git commit with the converted files.

set -euo pipefail

if ! command -v cwebp &>/dev/null; then
    echo "ERROR: cwebp not found. Install it with: brew install webp" >&2
    exit 1
fi

converted=0

for file in "$@"; do
    webp="${file%.*}.webp"
    echo "  converting: $file → $webp"
    cwebp -q 80 "$file" -o "$webp" -quiet
    git add "$webp"
    git rm --cached "$file" >/dev/null 2>&1 || true
    rm -f "$file"
    converted=1
done

if [[ $converted -eq 1 ]]; then
    echo ""
    echo "Images converted to WebP — re-run git commit to proceed."
    exit 1
fi
