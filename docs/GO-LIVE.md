# Go-live

What spacepeak.co needed to go live, who did it, and the evidence. Every item is done: live since 2026-11-28 ([#188](https://github.com/Colorado-Startups/space-peak/issues/188)).

```mermaid
flowchart LR
  A["Evidence and fact checks (Claude)"] --> B["Paul reads the preview"] --> C["Paul says go live"] --> D["Step 50: domain, HTTPS, crawlers (Claude)"]
```

## The list

| Item | Owner | State | Evidence |
| --- | --- | --- | --- |
| Five odds approved | Paul | Done | [#176](https://github.com/Colorado-Startups/space-peak/pull/176), [#180](https://github.com/Colorado-Startups/space-peak/pull/180) |
| Evidence on the preview | Claude | Done | [Evidence](#evidence) |
| Publish gate, fact-reviewer pass | Claude | Done | [Fact checks](#fact-checks) |
| Open data leaves out the Blanca and Crestones rows | Claude | Done | [#199](https://github.com/Colorado-Startups/space-peak/issues/199), [#204](https://github.com/Colorado-Startups/space-peak/pull/204) |
| The world's launch count on `/launch/` brought up to date | Claude | Done | [#198](https://github.com/Colorado-Startups/space-peak/issues/198), [#203](https://github.com/Colorado-Startups/space-peak/pull/203) |
| `/map/`'s drawings open on what they show at 375 px | Claude | Done | [#194](https://github.com/Colorado-Startups/space-peak/issues/194), [#209](https://github.com/Colorado-Startups/space-peak/pull/209) |
| Read the preview | Paul | Done | [spacepeak.coloradostartups.workers.dev](https://spacepeak.coloradostartups.workers.dev/) |
| Say "go live" | Paul | Done | Paul's words in chat, 2026-11-28 |
| Claude review token, a sign-in | Paul | Open, not needed to go live | `security.claude_review_share` reads 0%, a miss, on the [Quality page](https://colorado-startups.github.io/space-peak/) (2026-11-28) |
| Admin-read token, a sign-in | Paul | Open, not needed to go live | 23 metrics stay unmeasured and unscored, per the Quality page |
| spacepeak.co on the Worker, the www redirect, HTTPS | Claude | Done | [#212](https://github.com/Colorado-Startups/space-peak/pull/212); checks on [#211](https://github.com/Colorado-Startups/space-peak/issues/211#issuecomment-7243316592) |
| AI crawlers allowed | Claude | Done | spacepeak.co's robots.txt allows all agents, AI input and AI training. The zone blocks no AI bots |

## Evidence

| Evidence | Result | Source |
| --- | --- | --- |
| `ci.yml` on main at 0147c8f, merged here | 52 Playwright tests pass, axe on every route at 375 px and 1280 px | [run 46166041436](https://github.com/Colorado-Startups/space-peak/actions/runs/46166041436) |
| Lab vitals, worst of `/` and `/404.html` | LCP 0.79 s, CLS 0, TBT 0 ms, per the Quality page at 0147c8f, 2026-11-28 | [Design and Usability tabs](https://colorado-startups.github.io/space-peak/) |
| Quality page | Master 87 at 0147c8f, per the page, 2026-11-28 | [colorado-startups.github.io/space-peak](https://colorado-startups.github.io/space-peak/) |

Each page loaded in a browser at 375 px and 1280 px: status 200, one h1, no sideways scroll, every image loaded and sized, no Blanca or Crestones text. The browser's timings are not lab numbers.

| Page | Also checked | Found |
| --- | --- | --- |
| `/` | Masthead, painting, odds | The lead line read as fact; it now says it is our thesis |
| `/map/` | Region drawing | Opened on its empty west edge at 375 px ([#194](https://github.com/Colorado-Startups/space-peak/issues/194)). [#209](https://github.com/Colorado-Startups/space-peak/pull/209) fixed it |
| `/guide/` | Filter, search, both tables | The filter moved the table after first paint. Step 49 fixed it |
| `/launch/` | Profile, cadence, sites | Fine: the cadence slider loads below the fold |
| `/ai/` | Copy buttons, setup steps | Nothing |
| `/about/` | Listing flow, credits table | Its credits table scrolls in its own box |

## Fact checks

| Check | Result |
| --- | --- |
| Sources in `data/estimates/q-03.yaml` and `q-04.yaml` | Each cited line confirmed in a browser. q-03 adds the two 2008 Federal Register notices it cites |
| Publish gate over the six built pages | Self-tests pass; lint and claims find nothing blocking |
| Fact-reviewer | Six findings: three fixed in step 49 (q-03's sources, the home lead, the licence line) and three since ([#198](https://github.com/Colorado-Startups/space-peak/issues/198), [#199](https://github.com/Colorado-Startups/space-peak/issues/199), [#200](https://github.com/Colorado-Startups/space-peak/issues/200)). A side note, [#201](https://github.com/Colorado-Startups/space-peak/issues/201), is fixed too |
