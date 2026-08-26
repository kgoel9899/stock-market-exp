# Bulk & Block Deals Dashboard (NSE + BSE)

An interactive dashboard over Indian bulk and block deal disclosures, built from
[Trendlyne](https://trendlyne.com/portfolio/bulk-block-deals/all/) data for
**1 Jul 2026 - 25 Aug 2026** (40 trading days).

![tabs](https://img.shields.io/badge/tabs-9-blue) ![deals](https://img.shields.io/badge/deals-6%2C450-green) ![stocks](https://img.shields.io/badge/stocks-933-orange)

## What it does

| | |
|---|---|
| Qualifying deals | 6,450 (from 8,318 raw rows) |
| Stocks | 933 |
| Institutions | 1,926 |
| Buy value | Rs 73,991.34 cr |
| Sell value | Rs 92,186.70 cr |

Nine tabs: **Overview**, **Latest**, **By Stock**, **By Institution**, **Stock -> Institutions**,
**Institution -> Stocks**, **Daily**, **Daily - One-Sided** and **All Deals**. Rows in the aggregate tabs are
clickable and expand into the underlying individual deals. Every table is paginated,
and search/sort always run over the *whole* dataset before paging, never just the
visible page. Rupee figures are shown exactly in crore to two decimals; hovering a
value reveals the precise rupee amount.
Deal lists default to **most recent date first** - in the Daily and All Deals tabs,
and inside every expanded row of the By Stock and By Institution tabs.
Within a day, deals are grouped by institution and stock, with the buy leg listed
before the sell leg.

## Architecture

The whole thing is plain client-side JavaScript. No framework, no build step, no
dependencies, no server of its own. Data is scraped once into a JSON file, and
everything after that is rendering.

```
  Trendlyne          one HTTP request per calendar day, session cookie reused
      |
      v
  scrape.js          parse #bbdealTable -> raw rows -> clean()
      |
      v
  data.json          6,450 deal records - the only stored artefact
      |
      +-------------------------+
      |                         |
      v                         v
  app.js                    index.html
  (aggregate + render)      (app.js + data.json inlined into one file)
```

There are three stages and they are deliberately kept apart: **collection** happens
once and is throwaway, **cleaning** happens once and is baked into `data.json`, and
**aggregation** happens on every render because it depends on which filters are on.

### The deal record

One shape flows through the entire system. `scrape.js` emits it, `data.json` stores
it, and every table in the dashboard reads it:

| Field | Example | Notes |
|---|---|---|
| `day` | `"2026-07-01"` | ISO, so lexical sort = chronological sort |
| `stock` | `"Bang Overseas"` | Trendlyne short name |
| `client` | `"SANDEEP JAIN"` | as disclosed; one name can cover several funds |
| `exch` | `"NSE"` | NSE or BSE |
| `type` | `"Bulk"` | Bulk or Block |
| `action` | `"Purchase"` | Purchase or Sell |
| `price` | `"31.44"` | string, exactly as displayed |
| `qty` | `"84,823"` | string, exactly as displayed |
| `intraday` | `"No"` | |
| `pct` | `"0.63%"` | share of the day’s traded volume |
| `q` | `84823` | derived numeric quantity |
| `p` | `31.44` | derived numeric price |
| `val` | `2666835.12` | `q * p`, in **rupees** |

The display strings are kept alongside the numerics on purpose: the strings are what
gets shown, the numbers are what gets sorted and summed, and neither has to be
re-parsed at render time. Conversion to crore happens only at the moment of display
(`val / 1e7`) and is never stored, which is why no rounding accumulates.

### scrape.js - collection and cleaning

Paste-into-the-console script rather than a module, because it relies on your logged
in Trendlyne session (`fetch` with `credentials: "include"`). Four functions:

- `dayRange(from, to)` expands a date range into a list of ISO days.
- `fetchDay(day)` requests one day, parses the HTML with `DOMParser`, finds
  `#bbdealTable` and maps each row’s ten `<td>` cells into a deal record.
- `scrape(from, to)` loops the days and concatenates. One day at a time, because the
  free tier caps how many rows a single query returns.
- `clean(raw)` derives `q`, `p` and `val`, then applies the two cleaning rules.

The run commands at the bottom are left commented out so that pasting the file does
nothing until you ask it to.

### app.js - the dashboard

412 lines in four layers, bottom to top.

**1. `window.CSS_SRC`** - the entire stylesheet as one string (~3.6 KB), injected
into `<head>` at render time. Keeping it in JS is what allows the standalone build to
be a single file.

**2. `paginatedTable(mount, opts)`** - the one generic component everything else is
built from. Options are `rows`, `cols`, `pageSize`, `sizes`, `sortIdx`,
`placeholder`, `text` and `expand`. A column is `{ h, l, f, v }`: header label,
left-align flag, a formatter returning HTML, and a value function used for sorting.

Two properties matter. First, **search and sort always run over the full `rows` array
and only then is a page sliced out** - so searching never means "search the 25 rows
you can see". Second, every instance generates its own `uid`, so tables can nest
inside other tables’ expanded rows without colliding. `expand(row)` returns the HTML
for a detail row; nested tables are built lazily on first open and guarded by a
`data-done` flag so re-opening is free.

**3. Pure data helpers.**

- `orderDeals(rows)` - the canonical ordering used everywhere deals are listed:
  newest day first, then the largest client+stock group that day, then **buy leg
  before sell leg**, then larger value.
- `excludeRoundTrips(rows, tolPct)` - groups by day + client + stock and drops whole
  groups whose buy and sell quantities agree within `tolPct`. At 100% this becomes
  "was this institution on both sides at all", which is exactly what the
  Daily - One-Sided tab needs, so that tab reuses this function rather than
  duplicating the logic.

**4. `buildDashboard(deals, meta)`** - pure aggregation, touches no DOM. It walks the
deal array once and builds four keyed maps - by stock, by institution, by day, and by
stock+institution pair - accumulating `{ deals, bq, bv, sq, sv, parties, days }` for
each, alongside three row indexes (`rbs`, `rbi`, `rbd`) so any expanded row can find
its underlying deals without re-scanning. For the current dataset that yields 933
stocks, 1,926 institutions, 40 days and 3,114 stock+institution pairs. Being pure, it
can safely be called more than once - and is: once for the main dataset and once for
the one-sided subset that feeds its own tab.

**`renderDashboard(deals, meta)`** is the only function that writes to the document.
It injects the stylesheet, draws the KPI cards and the filter toggle, expands a
`TABS` array into a tab strip plus one empty pane per tab (`p_ov`, `p_st`, `p_in`,
`p_td`, `p_gs`, `p_gi`, `p_dy`, `p_dc`, `p_dl`), then mounts a `paginatedTable` into each.

Filter state lives on `window.__RTS`: `on` and `tol` for the round-trip toggle, `tab`
for which tab you are looking at, plus a reference to the unfiltered deal array so a
rebuild can always start from the original data rather than from an already-filtered
copy. Changing the toggle calls `rerenderDashboard()`, which throws the page away and
rebuilds it, restoring the tab you were on. A full rebuild rather than a patch, because every
aggregate and every headline number depends on the filter - at 6,450 rows it is
instant, and it removes a whole class of stale-state bugs.

### index.html and dashboard.html - the standalone build

Both are the same file, generated by concatenating: `app.js` verbatim inside a
`<script>`, then a second `<script>` holding `const DEALS = [...]` (the contents of
`data.json`), `const META = {...}` (title, subtitle and the cleaning note), and a
single call to `renderDashboard(DEALS, META)`.

That is the entire bootstrap. Because nothing is fetched, the file opens from
`file://` and can be served by GitHub Pages with no configuration.

### What happens when you click a date

Worth tracing once, because every expandable row in the dashboard works this way. The
Daily table was mounted with an `expand` callback. Clicking the row inserts a detail
row containing an empty `<div>`, and a queued callback then mounts a *second*
`paginatedTable` into it, whose `rows` are `orderDeals(rbd[date])` - that day’s deals,
pulled straight from the row index built during aggregation, already in canonical
order. The inner table has its own search box, page size and pager, entirely
independent of the outer one.

---

## How the data is collected

Trendlyne server-renders the entire result set for a date range into `#bbdealTable`.
The pager at the bottom of their page is a client-side DataTables widget slicing rows
that are already in the document, so there is nothing to click through - one request
per day returns everything.

`scrape.js` therefore issues one `fetch()` per calendar day (the free tier caps how
many rows a single query returns, so a day at a time avoids truncation), parses the
returned HTML with `DOMParser`, and reads the rows straight out of the table.

## Cleaning rules

1. **Matched round trips removed.** Any client that both bought *and* sold the same
   stock in the same quantity on the same day has that matched buy/sell pair dropped -
   869 pairs, 1,738 rows. This is overwhelmingly intraday market-maker and arbitrage
   churn (NK Securities, Junomoneta Finsol, HRTI, Microcurves and similar).
2. **Feed duplicates removed.** 130 rows where one trade was reported twice, once in
   the Bulk feed and once in the Block feed, which would otherwise double-count value.

A note on **net = 0.00 cr**: some stocks show an exactly zero net. That means both
sides of the transaction were disclosed - typically a promoter or intra-group transfer
(Adani Power, Adani Green, Bayer Cropscience), or an offer-for-sale where one seller
is matched by many named buyers (One97, Meesho). For those names the turnover column
is the meaningful one, not the net.

## Optional: exclude same-day round trips

The two cleaning rules above are baked into `data.json`. The dashboard adds a third,
optional filter as a toggle in the header: it hides every institution + stock + day
whose buy and sell quantities agree within a chosen tolerance (0.1%, 0.5%, 1%, 2% or
5%) and recomputes every table and headline figure.

This catches the near-matched round trips that the exact-quantity rule misses - for
example Graviton buying 8,775,327 Kalyan Jewellers shares and selling 8,775,262 the
same day, a gap of 65 shares on 8.8 million. At 1% it hides 904 of 6,450 rows and turnover falls from Rs 1,66,178.04 cr to Rs 1,37,157.65 cr; at 0.1% it hides 360 rows whose combined residual net position is only about Rs 6.64 cr.

The toggle defaults to **off**, so the figures quoted above and the contents of
`data.json` are unaffected. Two caveats: it drops the whole group including any
genuine residual position, and a single client name can cover several funds.

## The "Latest" tab

A single-day view of the most recent trading day in the data, for the question "what
changed hands, and who was on each side?". It splits that day into two tables -
**Bought on <date>** and **Sold on <date>** - each listing the stock, the institution
or client, the exchange, bulk/block, quantity, price and deal value, sorted largest
value first and searchable and paged like every other table. Above them sits a
one-line summary: deal count, distinct stocks, distinct institutions, bought and sold
value, net and turnover.

The date is `max(day)` over the deal array, computed at render time from the
*unfiltered* rows so the round-trip toggle can shrink the lists but never move the
date. It is deliberately **not** the machine's clock: after midnight, on a weekend or
holiday, or before the day's scrape has been run, the clock is ahead of the data and a
clock-driven tab would sit empty or claim a date the dataset has nothing for. Only
that one date is ever shown - **Daily** remains the place to look at history.

When the data is behind the clock, the tab says so in a muted line under the summary -
"Data is 1 day behind this machine's clock (13 Aug 2026)" - so a stale scrape is
visible rather than silently presented as current. The clock is used for that notice
and nothing else.

The round-trip toggle applies here as it does everywhere else, so switching it on
removes matched churn from both lists and from the summary line. In the pathological
case where it hides every deal on that day, the tab says that too rather than
rendering two empty tables.

## The "Daily - One-Sided" tab

This is the **Daily** tab with one extra rule applied: on each day, any institution
that both bought **and** sold the same stock that day is dropped entirely - whatever
the quantities, however lopsided. Where the tolerance toggle above asks "did the two
sides roughly cancel?", this tab asks the blunter question "was this institution on
both sides at all?".

What survives is directional flow only: institutions that purely bought, or purely
sold, a given stock on a given day.

| | |
|---|---|
| Rows kept | 3,096 of 6,450 |
| Rows removed | 3,354, across 1,600 institution + stock + day combinations |
| Stocks | 756 |
| Institutions | 1,772 |
| Buy value | Rs 43,961.88 cr |
| Sell value | Rs 63,110.60 cr |
| Turnover | Rs 1,07,072.48 cr |

It behaves exactly like the Daily tab otherwise - click any date to open every
surviving deal for that day, both lists are paged independently, and the search box
looks through all deals on all days.

Because this rule is strictly stronger than any tolerance the toggle offers, the tab
shows the same 3,096 rows whether the round-trip toggle is on or off. Note that it
only removes an institution from the stock it traded both ways - it keeps genuine
two-party blocks, where one institution sells and a different one buys.

## Running it

`index.html` is a single self-contained file with the data inlined, so there is no
server and no build step - just open it:

```
git clone <this repo>
cd <this repo>/bulk-block-deals-dashboard
# then open index.html in any browser (file:// is fine)
```

`app.js` and `data.json` are the sources it is generated from. They are kept for
editing and for re-running the scrape, but are not needed to view the dashboard.

---

## Hosting on GitHub Pages

Because `index.html` depends on nothing but itself, the folder can be served as-is.
In the repository go to **Settings -> Pages**, set **Source** to *Deploy from a
branch*, choose branch `main` and folder `/ (root)`, and save. The dashboard then
lives at:

```
https://kgoel9899.github.io/stock-market-expts/bulk-block-deals-dashboard/
```

A second `index.html` at the repository root redirects here, so the bare site URL
(`https://kgoel9899.github.io/stock-market-expts/`) lands on the dashboard instead of
returning a 404.

Two caveats. GitHub Pages on a **private** repository requires a paid plan (Pro, Team
or Enterprise); on the free tier the repository has to be public before Pages will
publish. And the page is roughly 1 MB because the data is inlined, so the first load
pulls the whole dataset in a single request.

---

## Extending the date range

*Read this section first if you are picking the project up later. Everything needed
lives in this repo - no state from the original session is required.*

**Source URL** - one request per calendar day:

```
https://trendlyne.com/portfolio/bulk-block-deals/all/?defaultStockgroup=all&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

Fetch with `credentials: 'include'` from a tab already on trendlyne.com - the
logged-in session cookie is required to get the full row set. The whole day is
server-rendered into `#bbdealTable`, so no pagination has to be driven.

**Why appending is safe.** Both cleaning rules are scoped to a single day - the
round-trip rule groups by `(day, client, stock)` and the feed-duplicate rule by
`(day, stock, client, action, qty, price, exchange)`. No new day can change how an
existing day was cleaned, so fresh rows can be appended to `data.json` without
reprocessing history.

**Steps**

1. Open the Trendlyne bulk/block deals page in a logged-in tab.
2. Paste `scrape.js` into the DevTools console.
3. Scrape only the new dates, clean them, and merge with what is already here:

```js
const raw    = await scrape('2026-08-15', '2026-08-21');  // new range only
const fresh  = clean(raw);
const merged = (await (await fetch('data.json')).json()).concat(fresh);
copy(JSON.stringify(merged));  // paste into data.json
```

4. Regenerate `index.html` (and its `dashboard.html` copy) by inlining the new JSON
   into the standalone build.
5. Update the summary numbers at the top of this README and the date range in the
`META` object at the bottom of `index.html` / `dashboard.html`.

Weekends and market holidays return zero rows and are skipped automatically - in the
original run, 40 calendar days yielded 28 trading days.

To rebuild the whole range from scratch instead, call
`await scrape('2026-07-01', '<end date>')` and skip the merge step.

**One caution.** Trendlyne occasionally revises historical disclosures after the fact.
If you want strict correctness rather than pure appending, re-fetch the last few days
of the existing range and overwrite those days rather than assuming they are frozen.

## Known limitations

- The round-trip filter is **exact quantity only**. A client that buys 100,000 and
sells 95,000 of the same stock on the same day still appears in full, on both legs.
- `data.json` holds the cleaned 6,450 rows only. The 1,868 removed rows are not
preserved anywhere, so inspecting what was filtered out requires a re-scrape.
- Figures are disclosed bulk/block deal values, not total market turnover in a stock.

## Files

See [Architecture](#architecture) for how these fit together.

| File | Size | Role |
|---|---|---|
| `index.html` | ~1501 KB | **The dashboard.** Self-contained single file with `app.js` and the data inlined. This is what GitHub Pages serves and what you open locally. |
| `dashboard.html` | ~1501 KB | Byte-identical copy of `index.html`, kept under its original name. |
| `app.js` | 36.2 KB | Source of the dashboard: stylesheet, the `paginatedTable` component, the ordering and filtering helpers, aggregation (`buildDashboard`) and rendering (`renderDashboard`). |
| `data.json` | 1463 KB | The 6,450 cleaned deal records. The only stored data artefact. |
| `scrape.js` | 3.7 KB | Console script that collects from Trendlyne one day at a time and applies the two cleaning rules. Not loaded by the dashboard. |

`app.js` + `data.json` are the sources; `index.html` is generated from them. Editing
the sources alone will not change the hosted page until the single-file build is
regenerated - see [Extending the date range](#extending-the-date-range).

## Disclaimer

Data belongs to Trendlyne / the exchanges and is included here only as a snapshot for
this analysis. Nothing here is investment advice.
