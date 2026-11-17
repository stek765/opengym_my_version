#!/bin/sh
# Downloads the exercise pictures into media/img.
# They are not in this repo: they belong to hasaneyldrm/exercises-dataset (see NOTICE.md).
# Pinned to the commit the app's exercise list was built from. Safe to run again: existing files are skipped.
set -e
cd "$(dirname "$0")/.."
DATASET=https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd
mkdir -p media/img
# fe-* pictures come from yuhonas/free-exercise-db (Unlicense): fe-<id>.jpg = exercises/<id>/0.jpg
FREEDB=https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5
missing() { grep -o '"img":"[^"]*"' frontend/src/lib/exercises-data.js | cut -d'"' -f4 |
  while read -r f; do [ -s "media/img/$f" ] || echo "$f"; done; }
missing | grep -v '^fe-' | xargs -P 8 -I{} curl -fsS --retry 3 -o "media/img/{}" "$DATASET/images/{}"
missing | grep '^fe-' | sed 's/^fe-\(.*\)\.jpg$/\1/' |
  xargs -P 8 -I{} curl -fsS --retry 3 -o "media/img/fe-{}.jpg" "$FREEDB/exercises/{}/0.jpg"
echo "media/img: $(ls media/img | wc -l | tr -d ' ') pictures"
