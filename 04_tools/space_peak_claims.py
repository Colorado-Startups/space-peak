#!/usr/bin/env python3
"""space_peak_claims.py: the fact guardrail for Space Peak.

Rules source, in precedence order:
  1. ~/.claude/rules/writing-and-gates.md   canonical for gate design, wins
  2. 02_substance/claims_register.md        canonical for which claims exist
  3. 04_tools/space_peak_rules.json         term lists and severities
  4. this script                            reads 2 and 3, decides nothing

If this script and the register disagree about what is frozen, the register
wins and this script is the bug.

Why this exists. The concept brief's subtitle says every fact about a
specific mountain is a starting point for real diligence, not a verified
site assessment. That discipline is lost slowly, one confident sentence at
a time, usually while writing for an audience. A writer shortens a hedged
sentence for rhythm. A summary drops the qualifier the original carried. A
number that appeared once with "on the order of" appears again without it.
Each step is defensible; the destination is a document making claims the
project cannot support. This script is the thing that notices.

Checks and their severity, which comes from the data file:

  frozen-row-edit      BLOCK  A frozen register row was weakened, unfrozen,
                              or deleted. Deterministic: a named row either
                              carries `frozen` or it does not.

  exclusion-proposed   BLOCK  Prose proposes a frozen site as viable. Blocks
                              despite using cue lists, because the site
                              names are literal matches against a closed
                              two-item list and the consequence is not a
                              style question.

  unregistered-claim    WARN  Prose states a figure about a place with no
                              register row. Regex detection of place-shaped
                              proper nouns is a heuristic by construction,
                              and the house rule is "block on the certain,
                              warn on the likely."

  unlabeled-claim       WARN  A registered `unverified` place appears with a
                              figure in a sentence carrying no speculative
                              label. The label often sits in a neighbouring
                              sentence this script cannot see.

POLICY SURFACE: classify_claim(). It implements "register-anchored plus a
catch-all for any unregistered place." Alternatives considered were strict
(flag any place name, elevation, or land-status word, which fires
constantly on prose that legitimately discusses the peaks) and loose (flag
only assertive constructions, which leaks a confidently worded claim).
Retune there, not by scattering conditions through the file.

Usage:
  python3 space_peak_claims.py --register 02_substance/claims_register.md FILE ...
  python3 space_peak_claims.py --self-test

Exit codes: 0 clean, 1 a blocking finding, 2 usage, 3 could not check.
"""

import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import space_peak_rules as R  # noqa: E402

# A checkable figure attached to a place: elevation, latitude, distance,
# acreage. Narrower than the lint script's FIGURE_RE on purpose; this one
# only answers "is there a number here worth a register row".
PLACE_FIGURE_RE = re.compile(
    r"""
    (?:
        \b\d{1,2}[,.]\d{3}\s*(?:ft|feet)?\b            # 14,047 / 12,300
      | \b\d{1,2}(?:\.\d+)?\s*(?:°|\bN\b|\bdegrees?\b)  # 37.1 N
      | \b\d[\d,.]*\s*k?\s*(?:ft|feet|acres|miles|mi)\b
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)

# The structural half of the catch-all, and the more important half: a
# place-shaped proper noun this project has never heard of. A known-names
# list can only catch names someone already thought to list, which is the
# inverse of the case that needs catching. A brand-new peak in new prose is
# the least-examined claim in the repository.
PLACE_SHAPE_RE = re.compile(
    r"""\b(
        (?:[A-Z][a-z]+\s+){1,2}(?:Peak|Peaks|Mountain|Mountains|Mtn|Mtns|
                                  Mesa|Butte|Ridge|Summit|Range)
      | Mount\s+[A-Z][a-z]+
      | Mt\.?\s+[A-Z][a-z]+
    )\b""",
    re.VERBOSE,
)

LINK_RE = re.compile(r"\[[^\]]*\]\([^)]+\)|https?://\S+")
INLINE_CODE_RE = re.compile(r"`[^`]*`")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
ROW_RE = re.compile(r"^\|\s*([A-Z]-\d+|\*\*[^|]+\*\*)\s*\|(.+)$")
STATUS_RE = re.compile(r"`(unverified|verified|corrected|unverifiable|frozen|open)`")


def parse_register(path, rules):
    """Return (registered, frozen, unverified) sets of known-place keys."""
    known = [p.lower() for p in R.terms(rules, "known_places")]
    registered, frozen, unverified = set(), set(), set()
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError as exc:
        raise R.InfraError(f"cannot read register {path}: {exc}")

    for raw in text.splitlines():
        if not ROW_RE.match(raw.strip()):
            continue
        cells = [c.strip() for c in raw.strip().strip("|").split("|")]
        if len(cells) < 3:
            continue
        status_m = STATUS_RE.search(raw)
        status = status_m.group(1) if status_m else None
        # Scan EVERY cell, not just the name column. A row's claim and notes
        # text names places too: the Culebra row names Cielo Vista Ranch, the
        # Spanish Peaks row names Comanche National Grassland. Scanning only
        # the name column reported those as unregistered on the very document
        # they came from.
        for cell in cells:
            name = cell.strip("* ").lower()
            if not name or name.startswith(("id", "site", "claim", "---")):
                continue
            for place in known:
                if place in name:
                    registered.add(place)
                    if status == "frozen":
                        frozen.add(place)
                    elif status == "unverified":
                        unverified.add(place)
    return registered, frozen, unverified


def strip_noise(line):
    line = INLINE_CODE_RE.sub(" ", line)
    line = LINK_RE.sub(" LINKED-SOURCE ", line)
    return line


def has_cue(sentence, cues):
    low = sentence.lower()
    return any(cue in low for cue in cues)


def frozen_key_for(sentence, aliases):
    low = sentence.lower()
    for key, alias_list in aliases.items():
        if any(alias in low for alias in alias_list):
            return key
    return None


def classify_claim(sentence, rules, registered, frozen, unverified):
    """THE POLICY SURFACE. Return (severity, check, message) or None.

    Register-anchored, plus a catch-all for any unregistered place. Order
    matters: the exclusion check runs first and short-circuits, so a
    sentence proposing Blanca is reported as an exclusion breach rather
    than as an ordinary unregistered claim.
    """
    low = sentence.lower()
    aliases = R.frozen_aliases(rules)
    labels = R.frozen_labels(rules)
    known = [p.lower() for p in R.terms(rules, "known_places")]
    proposal = R.terms(rules, "proposal_cues")
    negation = R.terms(rules, "negation_cues")
    speculative = R.terms(rules, "speculative_cues")

    # 1. A frozen site proposed as viable. A negation in the same sentence
    # inverts the proposal, so "never propose Blanca as viable" and "Blanca
    # is not a candidate" both pass. Found by running this checker over the
    # repository's own CONTRIBUTING.md, which states the rule and was
    # flagged for breaking it.
    key = frozen_key_for(sentence, aliases)
    if key and has_cue(sentence, proposal) and not has_cue(sentence, negation):
        return (R.severity_of(rules, "exclusion-proposed"), "exclusion-proposed",
                f"proposes a permanently excluded site ({labels[key]}) as "
                "viable; this is not an engineering judgement and is not "
                "revisable")

    # 2. Does this sentence attach a checkable figure to a place?
    if not PLACE_FIGURE_RE.search(sentence):
        return None

    mentioned = [p for p in known if p in low]

    # 3a. Catch-all, structural half: a place-shaped name we do not know.
    for m in PLACE_SHAPE_RE.finditer(sentence):
        name = m.group(1).strip()
        if not any(p in name.lower() for p in known):
            return (R.severity_of(rules, "unregistered-claim"),
                    "unregistered-claim",
                    f'states a figure about "{name}", which this project has '
                    "no register row for; add a row to claims_register.md "
                    "before asserting it")

    if not mentioned:
        return None

    # 3b. Catch-all, known-name half: a listed place with no register row.
    unregistered = [p for p in mentioned if p not in registered]
    if unregistered:
        return (R.severity_of(rules, "unregistered-claim"), "unregistered-claim",
                f'states a figure about "{unregistered[0]}", which has no row '
                "in claims_register.md; add a row before asserting it")

    # 4. A registered-but-unverified place stated without a label.
    unlabeled = [p for p in mentioned if p in unverified]
    if unlabeled and not has_cue(sentence, speculative):
        return (R.severity_of(rules, "unlabeled-claim"), "unlabeled-claim",
                f'figure about "{unlabeled[0]}" is registered `unverified` but '
                "this sentence carries no speculative label; confirm the label "
                "is nearby")
    return None


def check_register_integrity(register_path, rules):
    """BLOCK if a frozen row lost its status or its site vanished.

    frozen_sites in the data file is the authority, not the register. That
    asymmetry is deliberate defence in depth: deleting the Blanca row from
    the register must not disable the check protecting it, so a deletion
    shows up here as a failure rather than as silence.
    """
    _reg, frozen, _unv = parse_register(register_path, rules)
    labels = R.frozen_labels(rules)
    findings = []
    for key, alias_list in R.frozen_aliases(rules).items():
        if not any(alias in frozen or alias.split()[0] in frozen
                   for alias in alias_list):
            findings.append(
                (0, R.severity_of(rules, "frozen-row-edit"), "frozen-row-edit",
                 f'the permanent exclusion for "{labels[key]}" is missing or no '
                 "longer marked `frozen` in claims_register.md; restore it"))
    return findings


def lint_file(path, rules, registered, frozen, unverified):
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError as exc:
        raise R.InfraError(f"cannot read {path}: {exc}")

    findings = []
    in_fence = False
    for line_no, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        line = strip_noise(raw)
        for sentence in SENTENCE_SPLIT_RE.split(line):
            result = classify_claim(sentence, rules, registered, frozen,
                                    unverified)
            if result:
                findings.append((line_no,) + result)
    return findings


def report(path, findings):
    if not findings:
        print(f"{path}: clean")
        return
    for line_no, severity, check, message in findings:
        loc = f"{path}:{line_no}" if line_no else path
        print(f"{loc}: {severity} [{check}] {message}")
    fails = sum(1 for f in findings if f[1] == "FAIL")
    print(f"{path}: {fails} FAIL, {len(findings) - fails} WARN")


SELF_TEST_CASES = [
    ("Blanca Peak is the best site once the lane is cleared.",
     "exclusion-proposed", "FAIL"),
    ("We should tunnel through the Crestones instead.",
     "exclusion-proposed", "FAIL"),
    ("Blanca Peak is the preferred site.",
     "exclusion-proposed", "FAIL"),
    ("Mount Evans rises to 14,264 ft and fires clean to the east.",
     "unregistered-claim", "WARN"),
    ("Culebra Peak is 14,047 ft.",
     "unlabeled-claim", "WARN"),
    # Negation inverts a proposal. From this repo's own documentation.
    ("Never propose Blanca Peak or the Crestones as viable.", None, None),
    ("Blanca Peak is not a candidate and will not become one.", None, None),
    ("We build at Greenhorn rather than the Crestones.", None, None),
    ("Blanca Peak is excluded because it is sacred.", None, None),
    ("Culebra Peak is listed at approximately 14,047 ft, unverified.",
     None, None),
    ("The catapult supplies velocity and the thruster circularizes.",
     None, None),
]

SELF_TEST_REGISTERED = {"culebra", "greenhorn", "blanca", "crestones", "pikes peak"}
SELF_TEST_FROZEN = {"blanca", "crestones"}
SELF_TEST_UNVERIFIED = {"culebra", "greenhorn", "pikes peak"}


def self_test():
    """Seed known-bad and known-clean samples; fail if either misbehaves."""
    rules = R.load_rules()
    ok = True
    for sentence, expected, expected_sev in SELF_TEST_CASES:
        result = classify_claim(sentence, rules, SELF_TEST_REGISTERED,
                                SELF_TEST_FROZEN, SELF_TEST_UNVERIFIED)
        got = result[1] if result else None
        got_sev = result[0] if result else None
        if got == expected and got_sev == expected_sev:
            print(f"self-test: OK   [{expected or 'clean'}"
                  f"{'/' + expected_sev if expected_sev else ''}] "
                  f"{sentence[:46]}")
        else:
            print(f"self-test: FAIL expected {expected or 'clean'}/"
                  f"{expected_sev}, got {got or 'clean'}/{got_sev}: "
                  f"{sentence[:46]}")
            ok = False

    # The exclusion check must BLOCK and the heuristics must only WARN.
    if R.severity_of(rules, "exclusion-proposed") != "FAIL":
        print("self-test: exclusion-proposed must block: FAIL"); ok = False
    if R.severity_of(rules, "unregistered-claim") != "WARN":
        print("self-test: unregistered-claim must warn (heuristic): FAIL"); ok = False

    print("self-test:", "PASS" if ok else "FAIL")
    return R.EXIT_OK if ok else R.EXIT_BLOCKED


def _main(argv=None):
    parser = argparse.ArgumentParser(description="Space Peak claims guardrail")
    parser.add_argument("files", nargs="*")
    parser.add_argument("--register", default="02_substance/claims_register.md")
    parser.add_argument("--rules", default=None)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()
    if not args.files:
        parser.print_usage()
        return R.EXIT_USAGE

    rules = R.load_rules(args.rules)
    if not os.path.exists(args.register):
        raise R.InfraError(f"register not found: {args.register}")

    any_fail = False
    integrity = check_register_integrity(args.register, rules)
    if integrity:
        report(args.register, integrity)
        if any(f[1] == "FAIL" for f in integrity):
            any_fail = True

    registered, frozen, unverified = parse_register(args.register, rules)
    for path in args.files:
        if os.path.abspath(path) == os.path.abspath(args.register):
            continue
        findings = lint_file(path, rules, registered, frozen, unverified)
        report(path, findings)
        if any(f[1] == "FAIL" for f in findings):
            any_fail = True
    return R.EXIT_BLOCKED if any_fail else R.EXIT_OK


if __name__ == "__main__":
    sys.exit(R.run_guarded(_main))
