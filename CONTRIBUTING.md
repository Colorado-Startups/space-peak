# Contributing

## Setup, once per clone

```bash
git config core.hooksPath .githooks
```

Do this first. The hooks are not decoration: because `Colorado-Startups` is on GitHub Free, GitHub does not enforce rulesets on private repositories, so these hooks are the only blocking enforcement that exists. A clone without them can push anything.

Recommended, so the secret check runs locally:

```bash
brew install gitleaks
```

Without it the hooks report an INFRA notice and continue, because could not verify is not the same as verified and red. CI still scans.

## The workflow

1. Branch off `main`. Never commit to `main` directly.
2. Write. The Claude Code hooks comment as you go.
3. Commit. `pre-commit` routes to the checkers and blocks on the deterministic findings.
4. Push. `pre-push` runs the same checks again over what the push will send, because `--no-verify` skips step 3.
5. Open a pull request. Fill in the template honestly, including the claims checklist.
6. Read the checks. They are advisory and cannot block you, which makes reading them your job rather than the robot's.

## What blocks you

**An em dash, anywhere.** Comma, semicolon, period, or parentheses. Deterministic, so it blocks.

**A path under `local/`, or an oversized file.** These replace a push ruleset the Free plan does not offer.

**A detected secret.**

**Proposing Blanca Peak or the Crestones as viable.** They are permanent exclusions: sacred land and a National Park. You may name them and explain the exclusion. You may not argue past it.

**Weakening a frozen row** in `02_substance/claims_register.md`.

## What only warns you

A bare figure, an unregistered mountain claim, an unlabelled one, a long sentence, a hedge word. All heuristics, and the rule is block on the certain, warn on the likely. Read them; they are usually right. They do not stop you because a gate that fires wrongly and blocks gets bypassed, and a bypassed gate is worse than none.

## Two things no check can catch

Verify these by hand before anything ships:

- A hedged source set as an exact number in display type. "About 200 g" becoming "200 g" in a pull quote.
- A status verb drifting under compression. "The brief proposes" becoming "the plan is".

## If a check is wrong

Open a **Tooling** issue with the exact input. False positives are worth reporting as urgently as false negatives.

Do not work around a check by rewording a claim into something the regex misses. That is the one failure mode none of this can catch.

## Changing a rule

Rules live in `04_tools/space_peak_rules.json`, never in a script or a workflow. Edit the data file, then:

```bash
python3 04_tools/space_peak_contract_test.py
```

It fails if a new check is unclassified, if an exempt entry has no reason or no longer matches a real path, if a prose surface stopped naming the exclusions, or if a hook is wired but missing.

## Bypassing

`git commit --no-verify` exists and a human may sometimes need it. Say why in the commit message. `pre-push` still stops the push, deliberately. The Claude Code harness is denied the flag outright.
