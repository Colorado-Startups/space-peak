# Start here

Fifteen minutes to useful.

## 1. What this is (5 min)

Read `README.md`, then `02_substance/Space-Peak-Concept-Brief.md` as far as "The core insight". You do not need the whole brief yet.

The sentence that matters: a speculative venture thesis, not an engineering proposal. Physics sound, engineering 2040s-hard, every mountain fact unverified.

## 2. What you may not do (2 min)

Read "The two things that are never negotiable" in `CLAUDE.md`.

Short version: Blanca Peak and the Crestones are permanently excluded, and every factual claim about a peak needs a register row.

## 3. Set up (2 min)

```bash
git config core.hooksPath .githooks
python3 04_tools/space_peak_lint.py --self-test
python3 04_tools/space_peak_claims.py --self-test
python3 04_tools/space_peak_files.py --self-test
python3 04_tools/space_peak_contract_test.py
```

All four should pass. If one does not, the checks are broken and you should not trust a clean result from them. Open a Tooling issue.

## 4. See the guardrails work (3 min)

Worth doing once, so you know what they feel like before they surprise you mid-draft.

A warning, because the check is a heuristic:

```bash
printf 'Mount Democrat reaches 14,148 ft with a clean eastern lane.\n' > /tmp/try.md
python3 04_tools/space_peak_claims.py --register 02_substance/claims_register.md /tmp/try.md
```

A block, because the exclusions are certain:

```bash
printf 'Blanca Peak is the preferred site after all.\n' > /tmp/try.md
python3 04_tools/space_peak_claims.py --register 02_substance/claims_register.md /tmp/try.md
```

And one that passes:

```bash
printf 'Culebra Peak is listed at approximately 14,047 ft, unverified.\n' > /tmp/try.md
python3 04_tools/space_peak_claims.py --register 02_substance/claims_register.md /tmp/try.md
```

## 5. Where the work is (3 min)

`00_project_system/MASTER_PLAN.md`, Phase 3.

Phase 1's decision is made: publish, standalone, under the Space Peak name. Phases 2 and 4 are struck.
