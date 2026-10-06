#!/usr/bin/env bash
# Collect the markdown a PR touched and hand it to a checker.
#
# Usage:  bash .github/scripts/changed-md.sh voice|claims
#
# This script ROUTES. The exempt list, the term lists and the severities
# all live in 04_tools/space_peak_rules.json; the checkers apply them. CI
# never reimplements a check in YAML or in shell, per the house rule:
# "CI never reimplements a check in YAML. That is how a gate drifts
# between a laptop, a web edit, and a cloud agent."
#
# Checking only changed files is deliberate. The repository contains a
# historical source document written before these rules existed. Holding
# it to them would mean either rewriting history or turning the check off,
# and both are worse than scoping the check to new and edited prose.
set -uo pipefail

MODE="${1:?usage: changed-md.sh voice|claims}"
REGISTER="02_substance/claims_register.md"
EXIT_INFRA=3

if [ -n "${BASE_SHA:-}" ] && git rev-parse --verify --quiet "$BASE_SHA" >/dev/null; then
  raw="$(git diff --name-only --diff-filter=ACMR "$BASE_SHA" HEAD)"
else
  echo "::notice::No usable BASE_SHA; checking all tracked markdown."
  raw="$(git ls-files '*.md')"
fi

# The exempt list is read from the rules file, never copied here.
files=()
while IFS= read -r f; do
  case "$f" in *.md) ;; *) continue ;; esac
  [ -f "$f" ] || continue
  python3 - "$f" <<'PYEOF' && continue
import sys, os
sys.path.insert(0, "04_tools")
import space_peak_rules as R
sys.exit(0 if R.is_exempt(R.load_rules(), sys.argv[1]) else 1)
PYEOF
  files+=("$f")
done <<< "$raw"

rc=0

if [ "$MODE" = "claims" ]; then
  # Register integrity runs whether or not prose changed: the point is to
  # catch an edit to the register itself.
  echo "Register integrity check..."
  python3 04_tools/space_peak_claims.py --register "$REGISTER" /dev/null
  irc=$?
  [ "$irc" = "1" ] && rc=1
  [ "$irc" = "$EXIT_INFRA" ] && echo "::warning::register integrity could not run"
fi

if [ "${#files[@]}" -eq 0 ]; then
  echo "No changed content markdown to check."
  exit $rc
fi

echo "Checking ${#files[@]} file(s):"; printf '  %s\n' "${files[@]}"; echo

case "$MODE" in
  voice)  python3 04_tools/space_peak_lint.py "${files[@]}"; crc=$? ;;
  claims) python3 04_tools/space_peak_claims.py --register "$REGISTER" "${files[@]}"; crc=$? ;;
  *) echo "unknown mode: $MODE" >&2; exit 2 ;;
esac

if [ "$crc" = "$EXIT_INFRA" ]; then
  # Could not verify is not verified and red.
  echo "::warning::$MODE check could not run; see INFRA output above"
elif [ "$crc" != "0" ]; then
  rc=1
fi
exit $rc
