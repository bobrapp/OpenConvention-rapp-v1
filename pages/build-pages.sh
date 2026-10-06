#!/usr/bin/env bash
# Builds the GitHub Pages site: a version picker at / and one folder per app branch.
# Usage (from the repo root): pages/build-pages.sh [out_dir]
# VERSIONS entries: branch:folder:maker[:app subfolder inside the branch]
set -euo pipefail
OUT=${1:-_site}
VERSIONS=("Devin-v1:devin:Devin" "Claude-v1:claude:Claude:claude-v1" "Muse-v1:muse:Muse")

git fetch --quiet origin
rm -rf "$OUT"; mkdir -p "$OUT"
cp pages/index.html "$OUT/index.html"
touch "$OUT/.nojekyll"

json="["
for v in "${VERSIONS[@]}"; do
  IFS=: read -r branch dir maker sub <<<"$v"
  mkdir -p "$OUT/$dir"
  live=false; sha=""; date=""
  if git rev-parse --verify --quiet "origin/$branch" >/dev/null; then
    if [ -n "${sub:-}" ] && git cat-file -e "origin/$branch:$sub" 2>/dev/null; then
      git archive "origin/$branch:$sub" | tar -x -C "$OUT/$dir"
    else
      git archive "origin/$branch" | tar -x -C "$OUT/$dir"
    fi
    rm -rf "$OUT/$dir/pages" "$OUT/$dir/tests"
    sha=$(git rev-parse --short "origin/$branch")
    date=$(git log -1 --format=%cs "origin/$branch")
    if [ -f "$OUT/$dir/index.html" ]; then live=true; else echo "warn: $branch has no index.html at its root" >&2; fi
  fi
  if [ "$live" = false ]; then
    sed "s/__BRANCH__/$branch/g" pages/coming-soon.html > "$OUT/$dir/index.html"
  fi
  json+="{\"branch\":\"$branch\",\"maker\":\"$maker\",\"path\":\"$dir/\",\"live\":$live,\"sha\":\"$sha\",\"date\":\"$date\"},"
done
echo "${json%,}]" > "$OUT/versions.json"
echo "built $OUT:"; cat "$OUT/versions.json"
