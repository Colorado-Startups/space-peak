# Contributing

Space Peak is open to everyone. Corrections, sources, drafts, tooling fixes and good questions all count. You do not need to be an engineer to help.

## Two rules before anything else

**Blanca Peak and the Crestones are permanent exclusions.** Blanca Peak is Sisnaajini, sacred to the Navajo. The Crestones and Great Sand Dunes are a National Park. You may name them and explain the exclusion. You may not propose either as a site, and you may not argue past it.

**Every mountain fact is unverified until diligenced.** A checkable claim about a peak needs a row in `02_substance/claims_register.md`. If that row says `unverified`, your prose says so too.

## Ways to help

| You have | Start here |
| --- | --- |
| A question or an idea | [Discussions](https://github.com/Colorado-Startups/space-peak/discussions), in Q&A or Ideas |
| A claim that is wrong, or a source that verifies one | The **Claim correction** issue form |
| Feedback on a draft | The **Draft feedback** issue form |
| A checker that misfired | The **Tooling** issue form |
| A change ready to go | A pull request, below |
| A security concern | `SECURITY.md`. Never a public issue |

Issues labelled `good first issue` are a good place to start.

## Making a pull request

1. Fork the repository and clone your fork.
2. Turn on the hooks, once per clone:

   ```bash
   git config core.hooksPath .githooks
   ```

   You need `python3`. `gitleaks` is optional (`brew install gitleaks`). Without it the hooks print an INFRA notice and continue, and GitHub's push protection still scans.
3. Create a branch, write, and commit with a sign-off: `git commit -s`.
4. Push to your fork and open a pull request against `main`. Fill in the template, including the claims checklist.
5. Read the checks, and fix anything red.

### Sign-off (DCO)

Every commit needs a `Signed-off-by:` line, which `git commit -s` adds. It certifies the [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change, or you have the right to submit it. The `DCO` check fails without it.

Fix a missed sign-off with `git commit --amend -s`, or `git rebase --signoff main` for several commits, then push again. Commits that GitHub verifies as coming from `Colorado-Startups` org members skip the check (`.github/dco.yml`).

### Licensing of your contribution

Space Peak is dedicated to the public domain under CC0 1.0, and its code is also offered under 0BSD. See the README's "License" section. Your contribution comes in under the same terms. Do not submit material you cannot release that way, such as someone else's copyrighted text, images or data.

### Help from an AI agent

Using an AI agent is fine. Say so in the pull request. Agents follow `CLAUDE.md`; see `AGENTS.md`.

## What the checks do

Two checks must pass before a pull request can merge: `ci / ci-ok` and `DCO`. `ci / ci-ok` runs every checker in `04_tools/` in one job. The hooks run the same checkers on your machine first, so most problems show up before you push.

GitHub holds the first workflow run from a new contributor until a maintainer approves it. That is GitHub's protection for public repositories, not a judgement on your pull request.

### What blocks you

**An em dash, anywhere.** Use a comma, semicolon, period, or parentheses. The rule is deterministic, so it blocks.

**A detected secret.** GitHub's push protection rejects the push.

**Proposing Blanca Peak or the Crestones as viable.** They are permanent exclusions: sacred land and a National Park. You may name them and explain the exclusion. You may not argue past it.

**Weakening a frozen row** in `02_substance/claims_register.md`.

### What only warns you

A bare figure, an unregistered mountain claim, an unlabelled one, a long sentence, a hedge word. All are heuristics, and the rule is to block on the certain and warn on the likely. Read the warnings; they are usually right. They do not stop you, because a gate that fires wrongly and blocks gets bypassed, and a bypassed gate is worse than none.

### Two things no check can catch

Verify these by hand before anything ships:

- A hedged source set as an exact number in display type. "About 200 g" becoming "200 g" in a pull quote.
- A status verb drifting under compression. "The brief proposes" becoming "the plan is".

### If a check is wrong

Open a **Tooling** issue with the exact input. False positives are worth reporting as urgently as false negatives.

Do not work around a check by rewording a claim into something the regex misses. That is the one failure mode none of this can catch.

### Changing a rule

Rules live in `04_tools/space_peak_rules.json`, never in a script or a workflow. Edit the data file, then run:

```bash
python3 04_tools/space_peak_contract_test.py
```

It fails if a new check is unclassified, if an exempt entry has no reason or no longer matches a real path, if a prose surface stopped naming the exclusions, or if a hook is wired but missing.

### Bypassing

`git commit --no-verify` skips the local `pre-commit` hook. `pre-push` still stops the push, deliberately. Every required check also runs in CI, so a bypassed commit cannot merge until it passes. The Claude Code harness is denied the flag outright.

## Who decides

Paul (`@paul-co-startups`), founder of Colorado Startups, sets the product and the vision. The maintainers review and merge. A pull request merges when the required checks pass and a maintainer has read the whole diff. Disagreement goes to a Discussion, and Paul makes the final call on product and vision.

## For maintainers: reviewing outside pull requests

- Read the diff on GitHub or with `gh pr diff <number>`. Never check out or run a fork's code on your own machine. CI runs it in the cloud with a read-only token and no secrets.
- Approve the first workflow run only after reading what the pull request changes under `.github/`, `.githooks/`, `.claude/` and `04_tools/`.
- Squash merge, so `main` keeps one signed-off commit per pull request.
