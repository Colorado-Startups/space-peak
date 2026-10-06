#!/usr/bin/env python3
"""space_peak_lint.py: the mechanical half of the Space Peak voice check.

Rules source, in precedence order:
  1. ~/.claude/rules/writing-and-gates.md   canonical, wins
  2. 04_tools/space_peak_rules.json         machine-readable copy
  3. 01_doctrine/voice.md                   project prose, must agree with 2
  4. this script                            reads 2, decides nothing

If this script and the JSON disagree, the JSON wins. If the JSON and the
house rules file disagree, the house rules win and both get corrected in
the same session. The contract test enforces that 3 still agrees with 2.

Deterministic, no network, standard library only.

Lineage: ported from Photon Mountain's 04_tools/voice_lint.py (2026-07).
Three deliberate changes:

  * Term lists moved OUT of the source into space_peak_rules.json, per the
    house rule "Rules belong in data, not in a regex."
  * FIGURE_RE gained an aerospace noun set. The Photon Mountain regex hunts
    corridor economics (companies, workers, jobs, acres, megawatts). Space
    Peak's checkable figures are physical: elevations, g-forces, velocities,
    cadence. Ported verbatim it reported "clean" on the concept brief's most
    load-bearing claims (200 g, 8 km/s, 15,000 g, seven site elevations),
    which is worse than no check because it looks like coverage.
  * unattributed-figure is a WARNING, not a failure. The upstream script
    graded it FAIL while its own docstring called it a heuristic that "flags
    candidates for human review." The house rule is "block on the certain,
    warn on the likely," so severity now comes from the JSON and this one
    warns. em-dash still blocks: it is deterministic and auto-fixable.

Severity is never hardcoded here. Every finding asks the data file.

Usage:
  python3 space_peak_lint.py FILE [FILE ...]
  python3 space_peak_lint.py --self-test

Exit codes: 0 clean, 1 a blocking finding, 2 usage error, 3 could not
check (infrastructure). See space_peak_rules.py for the contract.
"""

import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import space_peak_rules as R  # noqa: E402

EM_DASH = "—"
EN_DASH = "–"

# A figure worth flagging. Deliberately narrow so small inline numbers
# ("step 4", "under 7 days", bare years) never fire.
FIGURE_RE = re.compile(
    r"""
    (?:
        [$€£]\s?\d[\d,.]*                 # money
      | \d[\d,.]*\s?(?:%|\bpercent\b)               # percentage
      | \b\d{1,3}(?:,\d{3})+\b                      # comma-grouped number
      | \b\d[\d,.]*\s?(?:million|billion|trillion|thousand)\b
      | \b\d[\d,.]*\s?(?:g|gs)\b(?!\w)              # g-force
      | \b\d[\d,.]*\s?(?:km/s|m/s|mph|mach)\b       # velocity
      | \b\d[\d,.]*\s?k?\s?(?:ft|feet|m|meters|miles|mi)\b
      | \b\d[\d,.]*\s?(?:kg|tons|tonnes|lb|lbs)\b   # mass
      | \b\d[\d,.]*\s?(?:GW|MW|kW|gigawatt|megawatt)s?\b
      | \b\d[\d,.]*\+?\s(?:[a-z-]+\s)?(?:satellites|launches|flights|
            shots|companies|firms|workers|employees|jobs|startups|acres|
            patents|labs|nines)\b
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)

LINK_RE = re.compile(r"\[[^\]]*\]\([^)]+\)|https?://\S+")
INLINE_CODE_RE = re.compile(r"`[^`]*`")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$")


def strip_noise(line):
    """Remove inline code and URLs before the content checks."""
    line = INLINE_CODE_RE.sub(" ", line)
    line = LINK_RE.sub(" LINKED-SOURCE ", line)
    return line


def sentence_has_attribution(sentence, cues):
    low = sentence.lower()
    if "linked-source" in low:
        return True
    return any(cue in low for cue in cues)


def row_carries_label(raw_line, cues):
    """True when a table row's own cells label the figures in that row.

    This exists because of a real bug, worth recording so it is not
    reintroduced. strip_noise() removes inline code spans BEFORE the
    attribution check, and 02_substance/claims_register.md marks every
    row's status as inline code (`unverified`, `frozen`). So the register
    was labelling all 19 of its rows correctly, this script was deleting
    the labels one step before looking for them, and the file failed with
    13 findings for having no labels.

    Scoped to table rows deliberately. Giving a whole prose line credit
    because some clause in it says "estimated" would be too lenient. A
    table row genuinely is one record whose status cell governs it.
    """
    if not TABLE_ROW_RE.match(raw_line):
        return False
    low = raw_line.lower()
    return any(cue in low for cue in cues) or "`frozen`" in low


def lint_text(text, rules, max_words=None):
    """Return findings as (line_no, severity, check, message).

    Severity comes from the data file for every check, never from here.
    """
    hedges = R.terms(rules, "hedge_words")
    tells = R.terms(rules, "ai_tells")
    attribution = R.terms(rules, "attribution_cues")
    max_words = max_words or rules["limits"]["max_sentence_words"]

    hedge_res = [
        (h, re.compile(r"\b" + re.escape(h).replace(r"\ ", r"\s+") + r"\b",
                       re.IGNORECASE))
        for h in hedges
    ]
    tell_res = [
        (t, re.compile(re.escape(t).replace(r"\ ", r"\s+"), re.IGNORECASE))
        for t in tells
    ]

    findings = []
    in_fence = False
    for line_no, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        if EM_DASH in raw:
            findings.append((line_no, R.severity_of(rules, "em-dash"), "em-dash",
                             "em dash found; use a comma, semicolon, period, "
                             "or parentheses"))
        if f" {EN_DASH} " in raw:
            findings.append((line_no, R.severity_of(rules, "spaced-en-dash"),
                             "spaced-en-dash",
                             "spaced en dash reads as an em dash; restructure"))

        line = strip_noise(raw)
        labeled_row = row_carries_label(raw, attribution)

        for hedge, hedge_re in hedge_res:
            if hedge_re.search(line):
                findings.append((line_no, R.severity_of(rules, "hedge-word"),
                                 "hedge-word",
                                 f'hedge "{hedge}"; say it plainly or cut it'))

        for tell, tell_re in tell_res:
            if tell_re.search(line):
                findings.append((line_no, R.severity_of(rules, "hedge-word"),
                                 "hedge-word",
                                 f'AI tell "{tell}"; see the table in '
                                 "~/.claude/rules/writing-and-gates.md"))

        for sentence in SENTENCE_SPLIT_RE.split(line):
            words = sentence.split()
            if len(words) > max_words:
                findings.append((line_no, R.severity_of(rules, "sentence-length"),
                                 "sentence-length",
                                 f"sentence has {len(words)} words (limit "
                                 f"{max_words}); split it, one idea per sentence"))
            m = FIGURE_RE.search(sentence)
            if m and not labeled_row and not sentence_has_attribution(sentence,
                                                                     attribution):
                findings.append((line_no,
                                 R.severity_of(rules, "unattributed-figure"),
                                 "unattributed-figure",
                                 f'figure "{m.group(0).strip()}" has no '
                                 "attribution cue, no goal label, and no "
                                 "speculative label; attribute it, label it, or "
                                 "register it in claims_register.md"))
    return findings


def report(path, findings):
    if not findings:
        print(f"{path}: clean")
        return
    for line_no, severity, check, message in findings:
        print(f"{path}:{line_no}: {severity} [{check}] {message}")
    fails = sum(1 for f in findings if f[1] == "FAIL")
    print(f"{path}: {fails} FAIL, {len(findings) - fails} WARN")


SELF_TEST_BAD = (
    "The muzzle holds vacuum — the hard part is the membrane.\n"
    "A 15 mile run at 200 g reaches 8 km/s.\n"
    "It is arguably the best granite in America for boring a tunnel, and this "
    "sentence keeps going and going, adding clause after clause, idea after "
    "idea, well past the point where a reader can hold it in one breath.\n"
    "| S-99 | Some Peak | Elevation 13,400 ft | | | |\n"
    "Let us delve into the seamless tapestry of launch economics.\n"
)

SELF_TEST_CLEAN = (
    "The catapult supplies velocity; a small thruster circularizes at apogee.\n"
    "The brief puts the acceleration on the order of 200 g, an unverified "
    "starting point rather than a verified figure.\n"
    "Reaching one launch an hour is a goal, not a demonstrated cadence.\n"
    "A slug could be retained whole to orbit.\n"
    "| S-04 | Culebra Peak | Elevation 14,047 ft | `unverified` | | |\n"
)


def self_test():
    """Seed a known-bad and a known-clean sample; fail if either misbehaves.

    Required by the house rule "Every gate ships a self-test."
    """
    rules = R.load_rules()
    bad = lint_text(SELF_TEST_BAD, rules)
    clean = lint_text(SELF_TEST_CLEAN, rules)
    hit = {f[2] for f in bad}
    ok = True

    for expected in ("em-dash", "unattributed-figure", "hedge-word",
                     "sentence-length"):
        if expected in hit:
            print(f"self-test: seeded {expected} flagged: OK")
        else:
            print(f"self-test: seeded {expected} NOT flagged: FAIL")
            ok = False

    # The bad sample's em dash must BLOCK and its figure must only WARN.
    sev = {f[2]: f[1] for f in bad}
    if sev.get("em-dash") != "FAIL":
        print("self-test: em-dash should be FAIL (deterministic): FAIL")
        ok = False
    else:
        print("self-test: em-dash blocks: OK")
    if sev.get("unattributed-figure") != "WARN":
        print("self-test: unattributed-figure should be WARN (heuristic): FAIL")
        ok = False
    else:
        print("self-test: unattributed-figure warns, does not block: OK")

    if any(f[1] == "FAIL" for f in clean):
        print("self-test: clean sample raised a FAIL: FAIL")
        for f in clean:
            print(f"  clean-sample:{f[0]}: {f[1]} [{f[2]}] {f[3]}")
        ok = False
    else:
        print("self-test: clean sample passes: OK")

    print("self-test:", "PASS" if ok else "FAIL")
    return R.EXIT_OK if ok else R.EXIT_BLOCKED


def _main(argv=None):
    parser = argparse.ArgumentParser(description="Space Peak voice lint")
    parser.add_argument("files", nargs="*", help="files to lint")
    parser.add_argument("--max-words", type=int, default=None)
    parser.add_argument("--rules", default=None, help="path to space_peak_rules.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()
    if not args.files:
        parser.print_usage()
        return R.EXIT_USAGE

    rules = R.load_rules(args.rules)

    any_fail = False
    for path in args.files:
        try:
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
        except OSError as exc:
            # Unreadable file is an infrastructure problem, not a content
            # violation. Fail open.
            raise R.InfraError(f"cannot read {path}: {exc}")
        findings = lint_text(text, rules, max_words=args.max_words)
        report(path, findings)
        if any(f[1] == "FAIL" for f in findings):
            any_fail = True
    return R.EXIT_BLOCKED if any_fail else R.EXIT_OK


if __name__ == "__main__":
    sys.exit(R.run_guarded(_main))
