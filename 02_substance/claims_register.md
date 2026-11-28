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

Transcribed from the brief's site tour. Every elevation, ownership status, land status, and firing-lane claim below is `unverified` until checked against a public source. S-05, S-16, S-18 and S-20 have been checked.

| ID | Site | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- | --- |
| S-01 | Greenhorn / Wet Mtns | Elevation about 12,300 ft | `unverified` | | |
| S-02 | Greenhorn / Wet Mtns | Fires east over Pinon Canyon Army live-fire land | `unverified` | | Corridor control is the whole engineering argument for this site. A search on 2026-11-27, a lead and not a read, found live fire at the Pinon Canyon Maneuver Site limited to .50 caliber and below in late 2025. Army plans from 2025 and 2026 would add larger weapons |
| S-03 | Greenhorn / Wet Mtns | Federal land | `unverified` | | A lead, not a read. A search on 2026-11-27 found the Greenhorn Mountain Wilderness in San Isabel National Forest. Whether the summit lies inside it is unchecked. E-07 rates national forest brutal |
| S-04 | Culebra Peak | Elevation 14,047 ft | `unverified` | | |
| S-05 | Culebra Peak | Colorado's southernmost 14er, about 37.1 N | `corrected` | Wikipedia, List of Colorado fourteeners, https://en.wikipedia.org/wiki/List_of_Colorado_fourteeners, read 2026-11-27 | Corrected. Was "Southernmost 14er". Mount Whitney in California lies further south. GNIS 269051 puts it at 36.57858 N, queried 2026-11-27 as in Site coordinates. NPS gives its summit as 14,505 ft (https://www.nps.gov/seki/planyourvisit/whitney.htm, read 2026-11-27). The list puts Culebra at 37.1224 N and the next, Little Bear Peak, at 37.5666 N. Latitude drives the spin argument |
| S-06 | Culebra Peak | Privately owned, Cielo Vista Ranch, single landowner | `unverified` | | Ownership may have changed; check current records. A search on 2026-11-27, a lead and not a read, found William Harrison as owner since a 2017 sale. The Colorado Sun still named him on 2026-02-20. Land-grant heirs hold access rights there under Lobato v. Taylor. Land-grant heirs won grazing rights there in May 2026, per the Colorado Sun of 2026-05-14 (a lead) |
| S-07 | Spanish Peaks | Elevation about 13,600 ft | `unverified` | | |
| S-08 | Spanish Peaks | Open southeast shot over Comanche National Grassland | `unverified` | | |
| S-09 | Spanish Peaks | Federal land | `unverified` | | A lead, not a read. A search on 2026-11-27 put the peaks in the Spanish Peaks Wilderness, San Isabel National Forest, run by the USDA Forest Service. E-07 rates national forest brutal |
| S-10 | Almagre (Baldy) | Elevation 12,367 ft | `unverified` | | |
| S-11 | Almagre (Baldy) | Same granite batholith as Pikes | `unverified` | | |
| S-12 | Almagre (Baldy) | USFS land; city watershed on its flanks | `unverified` | | |
| S-13 | Almagre (Baldy) | Southeast lane runs over Fort Carson ranges | `unverified` | | Lane claim, same class as S-02 and S-08 |
| S-14 | Pikes Peak | Elevation 14,115 ft | `unverified` | | |
| S-15 | Pikes Peak | About 39 N; fires east over Kansas and metro | `unverified` | | |
| S-16 | Pikes Peak | National Historic Landmark | `verified` | NPS, List of NHLs by State, https://www.nps.gov/subjects/nationalhistoriclandmarks/list-of-nhls-by-state.htm, read 2026-11-16 | Listed as "Pike's Peak - 07/04/61, El Paso County, CO" among Colorado's designated NHLs, not the "determined eligible" list |
| S-17 | Crestones / Sand Dunes | Elevation about 14,000 ft | `unverified` | | |
| S-18 | Crestones / Sand Dunes | Great Sand Dunes National Park & Preserve; the Crestones in the Sangre de Cristo Wilderness, Rio Grande National Forest, beside it | `verified` | USGS Geolex (Crestone Peak quadrangle); NPS Great Sand Dunes "Nearby attractions" | |
| S-19 | Blanca Peak | Elevation 14,345 ft | `unverified` | | |
| S-20 | Blanca Peak | Sisnaajini, sacred to the Navajo | `verified` | Great Sand Dunes NPP photo caption, 2016-12-08, https://commons.wikimedia.org/wiki/File:Blanca_Peak_(Sisnaajini)_(32221679993).jpg, read 2026-11-27 | Verified 2026-11-27. The park's caption calls it one of four sacred mountains to the Navajo. It gives the name as Sisnaajini, Dawn or White Shell Mountain. Credited NPS/Patrick Myers, from the park's Flickr account greatsanddunesnpp. The brief spells it Sisnaajiní |
| S-21 | Culebra Peak | Private-deal complexity; watershed | `unverified` | | The brief's veto for Culebra |

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

The brief calls the physics sound and the engineering 2040s-hard. These are the figures carrying that claim. P-01 and P-09 are cited; P-02 and P-03 were corrected on 2026-11-16.

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| P-01 | Low Earth orbit at space-station height takes about 17,500 mph sideways | `verified` | NASA, What Is Microgravity? (Grades 5-8), https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-microgravity-grades-5-8/, read 2026-11-16 | NASA gives the station's speed as 17,500 mph and says an orbiting craft moves fast enough that its fall matches Earth's curve |
| P-02 | Exiting at 12,000 to 14,000 ft leaves about 36 to 41 percent of atmospheric mass below the muzzle, per NASA Glenn's model | `corrected` | NASA Glenn, Earth Atmosphere Model, https://www.grc.nasa.gov/www/k-12/airplane/atmos.html, read 2026-11-16 | Was "about 40 percent". Troposphere model: T = 59 - 0.00356 h (F), p = 2116 [(T + 459.7)/518.6]^5.256 (lb/ft2). At 12,000 ft p = 1,348, so 1 - 1,348/2,116 = 36.3% below; at 14,000 ft p = 1,246, so 41.1% below. Mass below scales with the pressure drop |
| P-03 | About 200 g, a design target, over about a 10 mile run reaches about 8 km/s | `corrected` | OpenStax, University Physics Volume 1, 3.4 Motion with Constant Acceleration, equation 3.14, https://openstax.org/books/university-physics-volume-1/pages/3-4-motion-with-constant-acceleration, read 2026-11-16; arithmetic in Notes | Was "about a 15 mile run". Per constant acceleration from rest, v^2 = 2ad. Per the target, a = 200 x 9.81 = 1,961 m/s2. Per that, v = 8,000 m/s needs d = 8,000^2 / (2 x 1,961) = 16.3 km, about 10.1 mi. Per the same formula, the brief's 15 mi (24.1 km) at 200 g gives sqrt(2 x 1,961 x 24,140) = 9.7 km/s, and 8 km/s over 15 mi needs about 135 g. The SVG in `03_deliverables/infographics/03-Mass-driver-cross-section.svg` is unchanged |
| P-04 | Humans tap out around 10 g | `unverified` | | Supports the cargo-only-forever claim |
| P-05 | Guided artillery survives 15,000 g | `unverified` | | Load-bearing: the existence proof for ruggedization |
| P-06 | Satellites redesigned to survive about 200 g are the real moat | `unverified` | | The brief's own make-or-break item 1 |
| P-07 | A gigawatt-scale pulse released in seconds | `unverified` | | Sets the power and storage model |
| P-08 | Realistic cadence once an hour or better | `unverified` | | MASTER_PLAN flagged this as the claim most likely to break |
| P-09 | NASA has tested gecko-inspired grippers aboard the space station | `verified` | NASA, Science in Space: Robotic Helpers, https://www.nasa.gov/missions/station/iss-research/science-in-space-robotic-helpers/, read 2026-11-16 | An adhesive gripper on the Astrobee robot "functioned as anticipated". Was "flown by NASA" in the brief's nature footnote |
| P-10 | A vacuum muzzle, a membrane or plasma window, must hold the vacuum as the slug leaves at about 8 km/s | `unverified` | | Make-or-break item 2. The speed is P-03's. The brief says "Mach-23". Per NASA Glenn's model (P-02), air at 14,000 ft is about 260 K. Sound there runs about 324 m/s, from sqrt(1.4 x 287 x 260). So 8 km/s is about Mach 25. A search on 2026-11-27, a lead and not a read, found plasma windows only for particle beams. It also found a SpinLaunch membrane that its far slower projectile breaks |
| P-11 | A mass driver needs a long, clean reliability record before overland launch is approved | `unverified` | | Make-or-break item 3. The words "long clean reliability record" come from the brief's risk register. Per 14 CFR 450.131(a), read 2026-11-27, the FAA counts past flights in a vehicle's failure-probability estimate. The brief adds that no one has shown "nines" yet, which needs a defined bar. A search on 2026-11-27, a lead and not a read, put Falcon 9 Block 5 above 99.8 percent success |
| P-12 | The physics is sound and the engineering is 2040s-hard | `unverified` | | The brief's risk register, its timeline line. A judgment, not a measurement; Q-01 is the dated estimate |
| P-13 | The muzzle vacuum seal and satellite survival at about 200 g, the design target, are unsolved at production scale | `unverified` | | The brief's risk register. P-10 and P-06 are the make-or-break items it rests on |
| P-14 | The brief proposes a muzzle exit at 12,000 to 14,000 ft | `unverified` | | A design choice, not a measurement. P-02 gives the share of air below that height. P-12 and P-13 are held by step 35 |

## Infographic claims

Figures in `03_deliverables/infographics/` with no other row, found by the fact gate (#23). Each SVG still needs its label.

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| I-01 | "Aeroshell ablating, about 40 sec of drag" after the muzzle | `unverified` | | `03-Mass-driver-cross-section.svg` |
| I-02 | "High country about 9,000 ft" at the tunnel's foot | `unverified` | | `03-Mass-driver-cross-section.svg` |
| I-03 | The Front Range corridor runs about 180 miles along I-25 | `unverified` | | `01-Aerospace-Alley-map.svg` |
| I-04 | Maxar (satellite imagery) operates in the corridor under that name | `unverified` | | `01-Aerospace-Alley-map.svg`; a search suggests a 2025 rebrand, which needs a primary source |
| I-05 | The tunnel is about 10 mi long at the 200 g design target | `corrected` | Per P-03: OpenStax, University Physics Volume 1, 3.4, equation 3.14, read 2026-11-16 | `03-Mass-driver-cross-section.svg`. The label said "~15 mi"; changed to match P-03 |

## Economic and market claims

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| E-01 | GPS loss costs about one billion dollars per day per country | `unverified` | | Widely repeated; find the primary source or drop it |
| E-02 | About 250 rocket launches worldwide in a busy year | `unverified` | | Check against a current launch log; the number moves yearly |
| E-03 | Reusable rockets already cut dollars per kilogram tenfold | `unverified` | | |
| E-04 | FAA's 2008 Record of Decision backed licensing Spaceport America, an inland New Mexico site, for suborbital launch | `corrected` | 73 FR 79539, https://www.federalregister.gov/documents/2008/12/29/E8-30845, read 2026-11-27 | Corrected. Was "No inland US site has ever had FAA approval for overland launch". The notice gives the FAA's environmental approval to support a Launch Site Operator License for Spaceport America, in Sierra County. Its Final EIS notice, 73 FR 68492 (E8-27149, read 2026-11-27), covers horizontal and vertical suborbital launch. A site license is not a launch license; each launch needs its own under 14 CFR 450 (E-05). Leads, not reads: an FAA-licensed launch from White Sands, New Mexico, in 1989, and an inland site license at Mojave in 2004. Orbital launch from an inland site is unchecked; Q-03 is the estimate for it |
| E-05 | The FAA relationship and a cleared firing lane are a political achievement as much as an engineering one | `unverified` | | Make-or-break item 4. The claim keeps the brief's words. 14 CFR 450.1, read 2026-11-27, sets the requirements for a license to launch. A review on 2026-11-27, not yet read here, adds a Part 420 license for a new site and the FAA's term "flight corridor" for a lane. E-04 is the history claim |
| E-06 | A sonic boom corridor over any populated area is a civic fight | `unverified` | | The brief's risk register calls it the city-council problem |
| E-07 | Land status is destiny: National Park, never; sacred peak, never; national forest, brutal; Army range or single private owner, tractable | `unverified` | | The brief's risk register. S-18 and S-20 are why the brief says never to its Crestones / Sand Dunes and Blanca Peak rows |
| E-08 | Prove the technology on a coastal mountain with ocean downrange, safely for a decade; then an inland site gets its second interview | `unverified` | | Risk register. It names two example mountains; the claim leaves them out until each has its own row |
| E-09 | Saturn V, first launched in 1967, cost $5,200 per kg to low Earth orbit in 2018 dollars | `verified` | NASA Ames, ICES-2018-81. H. W. Jones, The Recent Large Reduction in Space Launch Cost, Table A2, https://ntrs.nasa.gov/api/citations/20200001093/downloads/20200001093.pdf, read 2026-11-27; NASA, Apollo 4, https://www.nasa.gov/mission/apollo-4/, read 2026-11-27 | $728 million a launch over 140,000 kg. Each cost row divides cost per launch by the most a system can lift to low Earth orbit. The paper's Table A1 dates the Saturn V 1968. NASA's Apollo 4 page gives its first launch as Nov. 9, 1967 |
| E-10 | The 22 systems first flown from 1970 to 2000 averaged $18,500 per kg to low Earth orbit in 2018 dollars | `verified` | NASA Ames, ICES-2018-81. H. W. Jones, section II.A, https://ntrs.nasa.gov/api/citations/20200001093/downloads/20200001093.pdf, read 2026-11-27 | The shuttle is one of the 22. The paper gives a typical range of $10,000 to $32,000 per kg |
| E-11 | The space shuttle, first launched in 1981, cost $61,720 per kg to low Earth orbit in 2018 dollars | `verified` | NASA Ames, ICES-2018-81. H. W. Jones, Tables A1 and A2, https://ntrs.nasa.gov/api/citations/20200001093/downloads/20200001093.pdf, read 2026-11-27 | $1,697 million a launch over 27,500 kg. Table A2 cites Pielke and Byerly (2011) for the cost. The abstract's $54,500 is before inflation |
| E-12 | Falcon 9, first launched in 2010, had a 2018 list price of $2,720 per kg to low Earth orbit | `verified` | NASA Ames, ICES-2018-81. H. W. Jones, Tables A1 and A2, https://ntrs.nasa.gov/api/citations/20200001093/downloads/20200001093.pdf, read 2026-11-27 | SpaceX's 2018 advertised $62 million over 22,800 kg. It is not today's price. Q-05 uses a later price over the reused payload, so it gets a higher figure |
| E-13 | Falcon Heavy, first launched in 2018, had a 2018 list price of $1,410 per kg to low Earth orbit | `verified` | NASA Ames, ICES-2018-81. H. W. Jones, Tables A1 and A2, https://ntrs.nasa.gov/api/citations/20200001093/downloads/20200001093.pdf, read 2026-11-27 | SpaceX's 2018 advertised $90 million over 63,800 kg. It is not today's price |
| E-14 | The choke point in the space economy is cost to orbit | `unverified` | | The brief's thesis, from its one-line pitch. Per ICES-2018-81, by H. W. Jones of NASA Ames, read 2026-11-27, very high launch cost "was long considered the major impediment to space exploration and exploitation" |

## Naming claims

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| N-01 | Colorado Springs sits in a valley at 6,035 ft | `unverified` | | |
| N-02 | Colorado Springs was named in 1871, springs actually in Manitou | `unverified` | | |
| N-03 | The opening lines of "America the Beautiful" came to Katharine Lee Bates atop Pikes Peak in 1893 | `corrected` | NPS, Places of Katharine Lee Bates and "America the Beautiful", https://www.nps.gov/articles/000/places-of-katharine-lee-bates-and-america-the-beautiful.htm, read 2026-11-16 | Was "written on the summit". NPS says the lines "first struck" her there; she published the poem in 1895 |
| N-04 | The project name is **Space Peak**. The brief now argues for it too | `corrected` | Decided 2026-10-08, cross-session orchestrator, on Paul's delegation | Was `open`. Route 2 of issue #2: the naming section was rewritten for Space Peak rather than keeping two names. See `01_doctrine/voice.md`, Terminology |

## Draft estimates

Probabilities for the site's odds section, one YAML file each in `data/estimates/`. An estimate is an opinion, not a fact. It never counts as verified and never enters schema.org output. Each row stays `open` until Paul approves it at go-live.

| ID | Claim | Status | Source | Notes |
| --- | --- | --- | --- | --- |
| Q-01 | A kinetic launcher puts a payload in orbit by 2040, at 7 percent | `open` | `data/estimates/q-01.yaml` | draft estimate, not yet approved |
| Q-02 | A kinetic launcher sends a payload above 100 km by 2035, at 12 percent | `open` | `data/estimates/q-02.yaml` | draft estimate, not yet approved |
| Q-03 | An orbital launch lifts off from an inland US site by 2040, at 12 percent | `open` | `data/estimates/q-03.yaml` | draft estimate, not yet approved |
| Q-04 | The world makes over 500 orbital launch attempts in 2030, at 40 percent | `open` | `data/estimates/q-04.yaml` | draft estimate, not yet approved |
| Q-05 | A published launch price falls below 1,000 dollars per kg by 2035, at 30 percent | `open` | `data/estimates/q-05.yaml` | draft estimate, not yet approved |

## How to add a row

1. Give it an ID in the right series (`S-`, `G-`, `R-`, `P-`, `E-`, `N-`, `I-`, `Q-`).
2. State the claim in one sentence, no em dashes.
3. Start it at `unverified` unless you are adding it with a source in hand.
4. If you verified it, fill the source column with something a reader can follow.

## How to change a row

Status may move from `unverified` to `verified`, `corrected`, or `unverifiable`, always in the same pull request as the evidence. A verification that lives only in a chat log has not happened.
