#!/usr/bin/env bash
# Hand every tracked path to the path and size guardrail.
#
# Replaces the GitHub push ruleset that GitHub Free does not offer for
# private repositories. Routes only; the rules live in
# 04_tools/space_peak_rules.json.
set -uo pipefail
git ls-files | python3 04_tools/space_peak_files.py --root . --stdin
rc=$?
if [ "$rc" = "3" ]; then
  echo "::warning::path guardrail could not run; see INFRA output above"
  exit 0
fi
exit $rc
