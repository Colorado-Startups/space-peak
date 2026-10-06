# Space Peak Voice

*Created 2026-10-05. Derived from the Photon Mountain voice doctrine, which this project mirrors for now and will diverge from over time.*

## Precedence, stated before anything else

This file restates rules that live elsewhere. Where it does:

1. **`~/.claude/rules/writing-and-gates.md` is canonical and wins.** It is the house writing standard for every project on this machine.
2. **`04_tools/space_peak_rules.json` is the machine-readable copy** that the checkers read. It must agree with the house file.
3. **This file is the project prose layer.** If it and the JSON disagree, the JSON wins. If the JSON and the house file disagree, the house file wins.

**The remedy, not just the precedence:** when a disagreement is found, the losing file is corrected in the same session. `04_tools/space_peak_contract_test.py` checks C12 and C12b, which fail if this file permits a term the data file bans or leaves a deliberate divergence undocumented. Precedence without a remedy becomes a standing excuse for drift.

One correction has already run through that path. An earlier draft of this file argued that conditionals are honest framing for technology that does not exist yet, and un-flagged "potentially" along with "could", "might" and "may". The house rules name **"potentially"** in the hedging cut list. The house file won: "potentially" is now banned here too, and the divergence covers only the three terms the house rules do not name.

## Lineage

Space Peak, Photon Mountain, and Fusion Canyon are driven by Colorado Startups and supported by Colorado AI. Space Peak ships under its own name, not the Photon Mountain brand. There was no reason to invent a voice from scratch when a working one exists next door, so this doctrine starts as Photon Mountain's and will earn its differences rather than assert them.

The mechanical half is `04_tools/space_peak_lint.py`, ported from `Photon Mountain/04_tools/voice_lint.py`. The judgement half is below, and in the `space-peak-voice-check` skill.

## The rules a machine enforces

Severity for every rule below comes from `04_tools/space_peak_rules.json`, never from the script. The split follows the house rule: **block on the certain, warn on the likely.** Blocking on a heuristic teaches people to bypass the gate, which costs more than it saves.

### Blocking: no em dashes, anywhere

Not in drafts, not in memos, not in commit messages, not in this file. Use a comma, a semicolon, a period, or parentheses. Four marks cover every job an em dash does, and each tells the reader more about the relationship between the clauses. A spaced en dash reads as an em dash, so that is out too.

This blocks because it is deterministic, fast, and auto-fixable without judgement. It is the only purely stylistic rule that gets that treatment.

History: the original concept brief was written with 35 em dashes, before this rule existed. The repository's first commit preserves it exactly as written, and a later commit normalizes it. The history shows the project as it actually was, which matters more than a clean first commit.

### Warning: no bare figures

Every number presented as a fact needs one of three things in the same sentence:

1. **An attribution.** Who says so, and where a reader can check.
2. **A goal label.** "Reaching one launch an hour is a goal" is honest. "The cadence is one launch an hour" is not, yet.
3. **A speculative label.** "On the order of 200 g, unverified" is honest. "200 g" alone is a claim this project has not earned.

This **warns** rather than blocks, which is a deliberate change from the upstream Photon Mountain script. That script graded it a failure while its own docstring called the check a heuristic that flags candidates for human review. A gate cannot both call itself a heuristic and block on itself.

### Warning: one idea per sentence

Flagged at 30 words, which is a proxy, not the rule. The real rule is meaning. If a reader has to hold two things at once to reach the period, split it. A 34-word sentence carrying one idea is fine. A 22-word sentence carrying three is not, and the linter will not catch it. That is what the judgement pass is for.

### Warning: plain and direct

Hedging words are flagged: arguably, perhaps, somewhat, potentially, seemingly, essentially, basically, virtually. Say it plainly or cut it. The full list is `hedge_words` in the rules file.

The AI tells from the house rules file are flagged under the same check: delve, tapestry, plethora, seamless, game-changer, a testament to, it's important to note, navigating the complexities, in conclusion.

**One documented divergence.** The Photon Mountain doctrine also treats "could be", "might be", and "may be" as hedges. This project does not. Space Peak is a speculative thesis about technology that does not exist yet, and conditional language is the honest register for it. Flagging conditionals would train the writer out of exactly the qualifications the thesis depends on.

The distinction: hedging is softening a claim you are making. A conditional is being precise about a claim you are not making.

This divergence is registered in the rules file under `hedge_words.deliberately_absent`, with its reason, and the contract test asserts this file still explains it. It covers only those three terms. "Potentially" is banned, because the house rules name it.

## The rules that need judgement

### Speculation is labelled, not implied

The concept brief's subtitle does the work in one line: a speculative venture thesis, not an engineering proposal, where every fact about a specific mountain is a starting point for real diligence rather than a verified site assessment.

Carry that framing into every piece. A reader should never have to infer that a number is unverified from the fact that the document seems speculative overall. The label goes next to the claim.

This is the rule `04_tools/space_peak_claims.py` and `02_substance/claims_register.md` exist to protect. Speculation left unlabelled does not stay speculation. It hardens into an asserted fact somewhere between a draft and a published piece, and nobody can point at the moment it happened.

### The two permanent exclusions are stated, never argued

**Blanca Peak** is Sisnaajini, sacred to the Navajo. **The Crestones and Great Sand Dunes** are a National Park.

Write these as settled, because they are. Do not stage them as a tension to be resolved, do not describe them as obstacles, and do not pair the exclusion with a note about how good the site would otherwise be. The concept brief calls Blanca high and south and on paper near-perfect one clause before excluding it, and that construction invites a reader to weigh the two against each other. They do not weigh against each other. One is an engineering observation and the other is not a matter for engineering.

### Honest about the timeline

The physics is sound. The engineering is 2040s-hard. Both halves ship together, every time. A piece carrying the first without the second is marketing, and this project has nothing to market yet.

### Write for a reader who will check

Assume someone reads this who knows more about mass drivers, Colorado land status, or FAA regulation than we do. That reader is the audience, not an adversary. It means no rounded-up numbers, no borrowed confidence, and no claim that would embarrass us if a specialist followed the citation.

### Two failure modes no lint can catch

From the house rules, and worth repeating because this project is unusually exposed to both:

- **A hedged source set as an exact number in display type.** The brief's "about 200 g" becoming "200 g" in a pull quote.
- **A status verb drifting under compression.** "The brief proposes" becoming "the plan is". Check both by hand before anything ships.

## What this doctrine does not cover yet

Deliberate gaps, to be filled when there is something real to say rather than filled now for completeness:

- Tone in long-form versus short-form. There is one draft; there is no evidence yet.
- Terminology, including the live conflict between "Space Peak" (the project) and "Satellite Peak" (the name the concept brief argues for). See issue #1 and row N-04 of the register. Once that resolves, the resolution belongs here.
- Visual voice. The Felt map and the SVGs need a convention for marking speculative sites and permanent exclusions differently. That convention belongs here once the map exists.
