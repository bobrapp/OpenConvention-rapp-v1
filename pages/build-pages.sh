#!/usr/bin/env bash
# Builds the GitHub Pages site: a version picker at / and one folder per app branch.
# Usage (from the repo root): pages/build-pages.sh [out_dir]
# VERSIONS entries: branch:folder:maker[:app subfolder][:source ref][:entry file served as index.html]
set -euo pipefail
OUT=${1:-_site}
VERSIONS=("Devin-v1:devin:Devin::${DEVIN_REF:-origin/Devin-v1}" "Claude-v1:claude:Claude:claude-v1" "muse-v1:muse:Muse:::R4 Muse V1")

git fetch --quiet origin
rm -rf "$OUT"; mkdir -p "$OUT"
cp pages/index.html "$OUT/index.html"
touch "$OUT/.nojekyll"

json="["
for v in "${VERSIONS[@]}"; do
  IFS=: read -r branch dir maker sub ref entry <<<"$v"
  ref=${ref:-origin/$branch}
  mkdir -p "$OUT/$dir"
  live=false; sha=""; date=""
  if git rev-parse --verify --quiet "$ref^{commit}" >/dev/null; then
    if [ -n "${sub:-}" ] && git cat-file -e "$ref:$sub" 2>/dev/null; then
      git archive "$ref:$sub" | tar -x -C "$OUT/$dir"
    else
      git archive "$ref" | tar -x -C "$OUT/$dir"
    fi
    if [ -n "${entry:-}" ] && [ -f "$OUT/$dir/$entry" ]; then mv "$OUT/$dir/$entry" "$OUT/$dir/index.html"; fi
    rm -rf "$OUT/$dir/pages" "$OUT/$dir/tests"
    sha=$(git rev-parse --short "$ref")
    date=$(git log -1 --format=%cs "$ref")
    if [ -f "$OUT/$dir/index.html" ]; then live=true; else echo "warn: $branch has no index.html at its root" >&2; fi
  fi
  if [ "$live" = false ]; then
    sed "s/__BRANCH__/$branch/g" pages/coming-soon.html > "$OUT/$dir/index.html"
  fi
  json+="{\"branch\":\"$branch\",\"maker\":\"$maker\",\"path\":\"$dir/\",\"live\":$live,\"sha\":\"$sha\",\"date\":\"$date\"},"
done
echo "${json%,}]" > "$OUT/versions.json"
# devin-v2/ was the first shared link for the Devin app; keep it serving the same build.
rm -rf "$OUT/devin-v2"; cp -R "$OUT/devin" "$OUT/devin-v2"
echo "built $OUT:"; cat "$OUT/versions.json"
