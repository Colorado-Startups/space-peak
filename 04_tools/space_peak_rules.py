#!/usr/bin/env python3
"""space_peak_rules.py: load space_peak_rules.json, and define the exit
contract every Space Peak gate shares.

Rules source: 04_tools/space_peak_rules.json. If this module and that file
disagree, the file wins. If the file and
Code-OS rules/writing-and-gates.md disagree, that file wins and both get
corrected in the same session.

Two jobs.

1. One loader, so no checker carries its own copy of a term list. Required
   by the house rule "Rules belong in data, not in a regex."

2. One exit contract, so "could not verify" never looks like "verified and
   red". Required by the house rule "Fail open on an infrastructure
   problem." Exit codes:

       0  EXIT_OK        checked, nothing blocking
       1  EXIT_BLOCKED   checked, a blocking finding
       3  EXIT_INFRA     could NOT check (missing file, bad JSON, no
                         interpreter). Callers treat this as a warning and
                         pass, never as a content violation.

   3 rather than 2, because argparse already exits 2 on a usage error and
   a usage error is a real defect, not an infrastructure hiccup.
"""

import json
import os
import sys

EXIT_OK = 0
EXIT_BLOCKED = 1
EXIT_USAGE = 2
EXIT_INFRA = 3

DEFAULT_RULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  "space_peak_rules.json")


class InfraError(Exception):
    """Could not perform the check. Never a content finding."""


def load_rules(path=None):
    """Return the parsed rules file, or raise InfraError.

    Raising rather than returning a default is deliberate. A silently
    empty rule set would make every checker report every file clean,
    which is the single worst failure mode available to a gate: it looks
    exactly like success.
    """
    path = path or DEFAULT_RULES_PATH
    try:
        with open(path, encoding="utf-8") as fh:
            rules = json.load(fh)
    except FileNotFoundError:
        raise InfraError(f"rules file not found: {path}")
    except json.JSONDecodeError as exc:
        raise InfraError(f"rules file is not valid JSON: {path}: {exc}")
    except OSError as exc:
        raise InfraError(f"cannot read rules file: {path}: {exc}")

    for required in ("severity", "frozen_sites", "limits"):
        if required not in rules:
            raise InfraError(f"rules file is missing '{required}': {path}")
    return rules


def terms(rules, *keys):
    """Pull a term list, tolerating the {_README, terms} wrapper shape.

    The JSON wraps some lists in an object so each can carry its own
    reason. Readers should not have to care which shape a given key uses.
    """
    node = rules
    for key in keys:
        node = node[key]
    if isinstance(node, dict):
        return list(node.get("terms", []))
    if isinstance(node, list):
        return [t for t in node if not (isinstance(t, str) and t.startswith("_"))]
    raise InfraError(f"term list has an unexpected shape: {'.'.join(keys)}")


def severity_of(rules, check):
    """Return "FAIL" or "WARN" for a check name, from the data file.

    An unclassified check raises rather than guessing. Guessing would let
    a new check quietly default to one severity while the documentation
    claimed the other, which is the drift the contract test exists to
    prevent.
    """
    sev = rules["severity"]
    if check in sev.get("blocking", []):
        return "FAIL"
    if check in sev.get("warning", []):
        return "WARN"
    raise InfraError(
        f"check '{check}' is in neither severity.blocking nor severity.warning "
        "in space_peak_rules.json; classify it there"
    )


def exempt_globs(rules):
    return [e["glob"] for e in rules["exempt_paths"]["entries"]]


def normalize_rel(path):
    """Strip a leading './' from a path, and nothing else.

    NOT path.lstrip("./"). lstrip takes a SET OF CHARACTERS, not a prefix,
    so it eats the leading dot of every dotfile: ".claude/agents/x.md"
    became "claude/agents/x.md". That silently killed every exemption
    whose glob began with a dot, which is most of them. The bug was
    invisible for a while because those paths are not markdown and so
    never reached the content checks anyway.
    """
    while path.startswith("./"):
        path = path[2:]
    return path


def is_exempt(rules, path):
    """True when a path's job is to describe the rules it would break.

    One definition, read by the git hooks, the Claude Code hooks, and CI.
    An earlier version of this repository duplicated this logic into two
    shell scripts, which is exactly the drift the house rule names.
    """
    import fnmatch
    norm = normalize_rel(path)
    for glob in exempt_globs(rules):
        if fnmatch.fnmatch(norm, glob) or norm == glob:
            return True
        # fnmatch's '*' already spans '/', but a trailing '/*' should also
        # match deeper paths, so ".claude/skills/*" covers
        # ".claude/skills/space-peak-publish-gate/SKILL.md".
        if glob.endswith("/*") and norm.startswith(glob[:-1]):
            return True
    return False


def frozen_aliases(rules):
    """Map frozen-site key to its alias list."""
    return {
        key: [a.lower() for a in node["aliases"]]
        for key, node in rules["frozen_sites"].items()
        if not key.startswith("_")
    }


def frozen_labels(rules):
    return {
        key: node["label"]
        for key, node in rules["frozen_sites"].items()
        if not key.startswith("_")
    }


def run_guarded(main_fn, argv=None):
    """Wrap a checker's main so InfraError becomes EXIT_INFRA, not a finding."""
    try:
        return main_fn(argv)
    except InfraError as exc:
        print(f"INFRA: {exc}", file=sys.stderr)
        print("INFRA: could not verify, which is not the same as verified and "
              "red. Passing; fix the cause.", file=sys.stderr)
        return EXIT_INFRA


if __name__ == "__main__":
    # Smoke check: load the rules and print a one-line summary.
    try:
        r = load_rules()
    except InfraError as e:
        print(f"INFRA: {e}", file=sys.stderr)
        sys.exit(EXIT_INFRA)
    print(f"rules OK: {len(r['severity']['blocking'])} blocking, "
          f"{len(r['severity']['warning'])} warning, "
          f"{len(frozen_aliases(r))} frozen sites, "
          f"{len(exempt_globs(r))} exempt globs")
