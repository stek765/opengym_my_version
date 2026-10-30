#!/bin/sh
# Downloads the exercise pictures into media/img (about 12 MB, 1324 files).
# They are not in this repo: they belong to hasaneyldrm/exercises-dataset (see NOTICE.md).
# Pinned to the commit the app's exercise list was built from. Safe to run again: existing files are skipped.
set -e
cd "$(dirname "$0")/.."
DATASET=https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd
mkdir -p media/img
grep -o '"img":"[^"]*"' frontend/src/lib/exercises-data.js | cut -d'"' -f4 |
  while read -r f; do [ -s "media/img/$f" ] || echo "$f"; done |
  xargs -P 8 -I{} curl -fsS --retry 3 -o "media/img/{}" "$DATASET/images/{}"
echo "media/img: $(ls media/img | wc -l | tr -d ' ') pictures"
