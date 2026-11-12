#!/usr/bin/env bash
# Relative-link check for markdown. Offline on purpose: no network, so it
# cannot flake, cannot be rate-limited, and adds no runner time. External URLs
# are left to the human doing the pre-ship fact pass.
set -uo pipefail
rc=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  dir="$(dirname "$f")"
  while IFS= read -r target; do
    [ -z "$target" ] && continue
    case "$target" in http://*|https://*|mailto:*|\#*) continue ;; esac
    clean="${target%%#*}"
    [ -z "$clean" ] && continue
    if [ ! -e "$dir/$clean" ] && [ ! -e "$clean" ]; then
      echo "::error file=$f::broken relative link: $target"
      rc=1
    fi
  done < <(grep -oE '\]\([^)]+\)' "$f" 2>/dev/null | sed 's/^](//; s/)$//' || true)
done < <(git ls-files '*.md')
[ "$rc" -eq 0 ] && echo "link-check: all relative links resolve"
exit $rc
