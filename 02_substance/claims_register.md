# Claims Register

*The keystone file of this repository. Created 2026-10-05 from `Space-Peak-Concept-Brief.md`.*

## What this is

Every checkable claim in the Space Peak material, with a status. The concept brief states its own discipline in its subtitle: a speculative venture thesis, not an engineering proposal, where every fact about a specific mountain is a starting point for real diligence rather than a verified site assessment. `00_project_system/MASTER_PLAN.md` carries that forward. Any step that touches a mountain fact treats it as unverified until diligenced.

This file is how that rule stops being a good intention and becomes something a machine can check. Three things read it:

- `.claude/hooks/space-peak-check-exclusions.sh`, which blocks a write proposing a frozen site.
- `.claude/hooks/space-peak-speculative-guard.sh`, which warns on a claim with no row here.
- `.github/workflows/ci.yml`, which runs the same checker over every tracked Markdown file on a pull request.

All three shell out to `04_tools/space_peak_claims.py`. There is one definition of the rule, not three.

**The rule for writers:** if you state a checkable claim, it needs a row. If its row says `unverified`, the prose must label it as unverified. There is no third option where a number appears bare.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `unverified` | From the brief, not yet checked against a source. Prose must label it speculative. |
| `verified` | Confirmed against a cited source. The source column is filled. |
| `corrected` | Checked, and the brief was wrong. The corrected value is authoritative. |
| `unverifiable` | Checked, and no public source settles it. Prose must say so or drop the claim. |
| `frozen` | A permanent exclusion. Never changes to any other status. |
| `open` | A live decision, not a fact awaiting diligence. |

## Frozen rows: the two permanent exclusions

These are not engineering judgements and are not subject to diligence, revision, or a better firing lane. They are the only rows here that may never change status. Any pull request that edits, weakens, softens, or removes either row fails the `frozen-row-edit` check and must be rejected.

| Site | Status | Reason, as the brief states it |
| --- | --- | --- |
| **Blanca Peak** | `frozen` | Sisnaajini, sacred to the Navajo. Do not. |
| **Crestones / Great Sand Dunes** | `frozen` | National Park. Absolute never. |

The brief describes Blanca Peak as high, southern, and on paper near-perfect. That is precisely why the row is frozen rather than merely ranked low. A good engineering case is the pressure that erodes a non-engineering answer over time, one reasonable-sounding draft at a time. The answer does not depend on the engineering case.

Defence in depth: these two sites are also named in `04_tools/space_peak_rules.json`, so deleting a row here does not disable the check that protects it. `04_tools/space_peak_contract_test.py` asserts the two stay in sync.

## Site table claims

Transcribed from the brief's site tour. Every elevation, ownership status, land status, and firing-lane claim below is `unverified` until checked against a public source. None has been checked yet.

| ID | Site | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| S-01 | Greenhorn / Wet Mtns | Elevation about 12,300 ft | `unverified` | | |
| S-02 | Greenhorn / Wet Mtns | Fires east over Pinon Canyon Army live-fire land | `unverified` | | Corridor control is the whole engineering argument for this site |
| S-03 | Greenhorn / Wet Mtns | Federal land | `unverified` | | |
| S-04 | Culebra Peak | Elevation 14,047 ft | `unverified` | | |
| S-05 | Culebra Peak | Southernmost 14er, about 37.1 N | `unverified` | | Latitude drives the spin argument |
| S-06 | Culebra Peak | Privately owned, Cielo Vista Ranch, single landowner | `unverified` | | Ownership may have changed; check current records |
| S-07 | Spanish Peaks | Elevation about 13,600 ft | `unverified` | | |
| S-08 | Spanish Peaks | Open southeast shot over Comanche National Grassland | `unverified` | | |
| S-09 | Spanish Peaks | Federal land | `unverified` | | |
| S-10 | Almagre (Baldy) | Elevation 12,367 ft | `unverified` | | |
| S-11 | Almagre (Baldy) | Same granite batholith as Pikes | `unverified` | | |
| S-12 | Almagre (Baldy) | USFS land; city watershed on its flanks | `unverified` | | |
| S-13 | Almagre (Baldy) | Southeast lane runs over Fort Carson ranges | `unverified` | | Lane claim, same class as S-02 and S-08 |
| S-14 | Pikes Peak | Elevation 14,115 ft | `unverified` | | |
| S-15 | Pikes Peak | About 39 N; fires east over Kansas and metro | `unverified` | | |
| S-16 | Pikes Peak | National Historic Landmark | `unverified` | | |
| S-17 | Crestones / Sand Dunes | Elevation about 14,000 ft | `frozen` | | Row exists only to record the exclusion |
| S-18 | Crestones / Sand Dunes | National Park | `frozen` | | **Absolute never.** Do not reclassify |
| S-19 | Blanca Peak | Elevation 14,345 ft | `frozen` | | Row exists only to record the exclusion |
| S-20 | Blanca Peak | Sisnaajini, sacred to the Navajo | `frozen` | | **Do not.** Do not reclassify |

## Physics and engineering claims

The brief calls the physics sound and the engineering 2040s-hard. These are the figures carrying that claim, and none is cited.

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| P-01 | Orbit requires about 17,500 mph sideways | `unverified` | | Textbook figure; should be trivial to cite |
| P-02 | Exiting at 12,000 to 14,000 ft puts about 40 percent of atmospheric mass below the muzzle | `unverified` | | The altitude-as-spec argument rests on this |
| P-03 | About 200 g over about a 15 mile run reaches about 8 km/s | `unverified` | | Check the arithmetic independently, not just the source |
| P-04 | Humans tap out around 10 g | `unverified` | | Supports the cargo-only-forever claim |
| P-05 | Guided artillery survives 15,000 g | `unverified` | | Load-bearing: the existence proof for ruggedization |
| P-06 | Satellites redesigned to survive about 200 g are the real moat | `unverified` | | The brief's own make-or-break item 1 |
| P-07 | A gigawatt-scale pulse released in seconds | `unverified` | | Sets the power and storage model |
| P-08 | Realistic cadence once an hour or better | `unverified` | | MASTER_PLAN flagged this as the claim most likely to break |

## Economic and market claims

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| E-01 | GPS loss costs about one billion dollars per day per country | `unverified` | | Widely repeated; find the primary source or drop it |
| E-02 | About 250 rocket launches worldwide in a busy year | `unverified` | | Check against a current launch log; the number moves yearly |
| E-03 | Reusable rockets already cut dollars per kilogram tenfold | `unverified` | | |
| E-04 | No inland US site has ever had FAA approval for overland launch | `unverified` | | Regulatory claim; verify before it ships |

## Naming claims

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| N-01 | Colorado Springs sits in a valley at 6,035 ft | `unverified` | | |
| N-02 | Colorado Springs was named in 1871, springs actually in Manitou | `unverified` | | |
| N-03 | "America the Beautiful" was written on the summit of Pikes Peak | `unverified` | | |
| N-04 | The project name is **Space Peak**. The brief now argues for it too | `corrected` | Decided 2026-10-08, cross-session orchestrator, on Paul's delegation | Was `open`. Route 2 of issue #2: the naming section was rewritten for Space Peak rather than keeping two names. See `01_doctrine/voice.md`, Terminology |

## How to add a row

1. Give it an ID in the right series (`S-`, `P-`, `E-`, `N-`).
2. State the claim in one sentence, no em dashes.
3. Start it at `unverified` unless you are adding it with a source in hand.
4. If you verified it, fill the source column with something a reader can follow.

## How to change a row

Status may move from `unverified` to `verified`, `corrected`, or `unverifiable`, always in the same pull request as the evidence. A verification that lives only in a chat log has not happened.

A `frozen` row does not move. If you believe a frozen row is wrong, that is a conversation to have with a human, not a pull request to open.
