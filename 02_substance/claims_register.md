# Claims Register

*The keystone file of this repository. Created 2026-10-05 from `Space-Peak-Concept-Brief.md`.*

## What this is

Every checkable claim in the Space Peak material, with a status. The concept brief states its own discipline in its subtitle: a speculative venture thesis, not an engineering proposal, where every fact about a specific mountain is a starting point for real diligence rather than a verified site assessment. `00_project_system/MASTER_PLAN.md` carries that forward. Any step that touches a mountain fact treats it as unverified until diligenced.

This file is how that discipline becomes something a machine can check. `.github/workflows/ci.yml` runs `04_tools/space_peak_claims.py` over every tracked Markdown file on a pull request. It warns and never blocks.

**For writers:** give a checkable claim a row, and label an `unverified` row as unverified in the prose.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `unverified` | From the brief, not yet checked against a source. Prose must label it speculative. |
| `verified` | Confirmed against a cited source. The source column is filled. |
| `corrected` | Checked, and the brief was wrong. The corrected value is authoritative. |
| `unverifiable` | Checked, and no public source settles it. Prose must say so or drop the claim. |
| `open` | A live decision, not a fact awaiting diligence. |

## Site table claims

Transcribed from the brief's site tour. Every elevation, ownership status, land status, and firing-lane claim below is `unverified` until checked against a public source. Only S-18 has been checked.

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
| S-17 | Crestones / Sand Dunes | Elevation about 14,000 ft | `unverified` | | |
| S-18 | Crestones / Sand Dunes | Great Sand Dunes National Park & Preserve; the Crestones in the Sangre de Cristo Wilderness, Rio Grande National Forest, beside it | `verified` | USGS Geolex (Crestone Peak quadrangle); NPS Great Sand Dunes "Nearby attractions" | |
| S-19 | Blanca Peak | Elevation 14,345 ft | `unverified` | | |
| S-20 | Blanca Peak | Sisnaajini, sacred to the Navajo | `unverified` | | |

## Site coordinates

Added 2026-11-15 for the map in `03_deliverables/map/`. Each row places one summit and says nothing else about it. A coordinate is the point USGS GNIS gives for the named summit, rounded to five decimal places. It verifies where the summit is, not any claim about it. The `S-` rows above keep their own status.

Every source is one public query of The National Map Gazetteer (USGS GNIS), layer 5, Landforms, run 2026-11-15:

`https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/5/query?where=gaz_name='NAME' AND state_alpha='CO'&outFields=*&outSR=4326&f=json`

`NAME` is the GNIS name in the Claim column. The feature ID is the `gaz_id` the query returns.

| ID | Site | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| G-01 | Greenhorn / Wet Mtns | Greenhorn Mountain, 37.88145 N, 105.01320 W, per GNIS | `verified` | GNIS 192544 | Not GNIS 175778, an Eagle County namesake |
| G-02 | Culebra Peak | Culebra Peak, 37.12222 N, 105.18578 W, per GNIS | `verified` | GNIS 193131 | Agrees with the latitude in S-05 |
| G-03 | Spanish Peaks | West Spanish Peak, 37.37567 N, 104.99370 W, per GNIS | `verified` | GNIS 194402 | One pin for the pair; see below |
| G-04 | Almagre (Baldy) | Almagre Mountain, 38.79119 N, 104.99346 W, per GNIS | `verified` | GNIS 193402 | "Baldy" is the brief's nickname |
| G-05 | Pikes Peak | Pikes Peak, 38.84059 N, 105.04491 W, per GNIS | `verified` | GNIS 204770 | |
| G-06 | Blanca Peak | Blanca Peak, 37.57757 N, 105.48561 W, per GNIS | `verified` | GNIS 192735 | |
| G-07 | Crestones / Sand Dunes | Crestone Peak, 37.96682 N, 105.58540 W, per GNIS | `verified` | GNIS 192423 | One pin for the site; see below |

Notes the table cannot hold:

- **G-03.** The brief names the Spanish Peaks as a pair. The map pins one summit per brief site, and this is the western one. GNIS returns two points for this feature, about 150 m apart per that query, and the map uses the first. East Spanish Peak is GNIS 194412.
- **G-07.** The brief names the Crestones and Great Sand Dunes as one site. The map pins Crestone Peak for it.

## The Colorado Startups region loop

These rows record the website's definition, not this repository's. On coloradostartups.org, "Space Peak" is also the Colorado Startups region for Colorado Springs and Fountain. That region is a loop of major roads. It is not a launch complex and says nothing about where a mass driver would go. The map draws it as its own layer.

Every row cites one source: `Colorado-Startups/coloradostartups.org`, `data/geo/regions.geojson`, feature `space-peak`, at commit `37232431f9bab6a2a3cb2e09701642f40b446187`. That repository's `data/geo/README.md` says the loop is traced from US Census TIGERweb road lines and was measured on 2026-11-15.

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| R-01 | The loop is closed by I-25, Interquest Pkwy, Powers Blvd, Mesa Ridge Pkwy and US-85 | `verified` | Field `roads` | A proposal, not a legal line |
| R-02 | Its corner cities are Colorado Springs and Fountain | `verified` | Field `cities` | |
| R-03 | It encloses 89 sq mi, per the website | `verified` | Field `area_sq_mi` | A shoelace check of the ring here gave 89.2 sq mi |
| R-04 | Its widest span is 22.7 mi, per the website | `verified` | Field `span_mi` | A haversine check of the ring here gave 22.85 mi |
| R-05 | It is 0.94 times the website's Silicon Valley loop, per the website | `verified` | Field `vs_silicon_valley` | US-101, I-280, CA-84; 95 sq mi, per the website |

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

1. Give it an ID in the right series (`S-`, `G-`, `R-`, `P-`, `E-`, `N-`).
2. State the claim in one sentence, no em dashes.
3. Start it at `unverified` unless you are adding it with a source in hand.
4. If you verified it, fill the source column with something a reader can follow.

## How to change a row

Status may move from `unverified` to `verified`, `corrected`, or `unverifiable`, always in the same pull request as the evidence. A verification that lives only in a chat log has not happened.
