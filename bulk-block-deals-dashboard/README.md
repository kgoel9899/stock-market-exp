# Bulk & Block Deals Dashboard (NSE + BSE)

An interactive dashboard over Indian bulk and block deal disclosures, built from
[Trendlyne](https://trendlyne.com/portfolio/bulk-block-deals/all/) data for
**1 Jul 2026 - 9 Aug 2026** (28 trading days).

![tabs](https://img.shields.io/badge/tabs-7-blue) ![deals](https://img.shields.io/badge/deals-4%2C268-green) ![stocks](https://img.shields.io/badge/stocks-673-orange)

## What it does

| | |
|---|---|
| Qualifying deals | 4,268 (from 5,572 raw rows) |
| Stocks | 673 |
| Institutions | 1,347 |
| Buy value | Rs 45,593.24 cr |
| Sell value | Rs 49,199.18 cr |

Seven tabs: **Overview**, **By Stock**, **By Institution**, **Stock -> Institutions**,
**Institution -> Stocks**, **Daily** and **All Deals**. Rows in the aggregate tabs are
clickable and expand into the underlying individual deals. Every table is paginated,
and search/sort always run over the *whole* dataset before paging, never just the
visible page. Rupee figures are shown exactly in crore to two decimals; hovering a
value reveals the precise rupee amount.
Deal lists default to **most recent date first** - in the Daily and All Deals tabs,
and inside every expanded row of the By Stock and By Institution tabs.

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
   619 pairs, 1,238 rows. This is overwhelmingly intraday market-maker and arbitrage
   churn (NK Securities, Junomoneta Finsol, HRTI, Microcurves and similar).
2. **Feed duplicates removed.** 66 rows where one trade was reported twice, once in
   the Bulk feed and once in the Block feed, which would otherwise double-count value.

A note on **net = 0.00 cr**: some stocks show an exactly zero net. That means both
sides of the transaction were disclosed - typically a promoter or intra-group transfer
(Adani Power, Adani Green, Bayer Cropscience), or an offer-for-sale where one seller
is matched by many named buyers (One97, Meesho). For those names the turnover column
is the meaningful one, not the net.

## Running it

```
git clone <this repo>
cd <this repo>/bulk-block-deals-dashboard
python3 -m http.server 8000
# open http://localhost:8000
```

A file server is needed because `index.html` fetches `data.json`. Alternatively open
`dashboard.html`, which is fully self-contained with the data inlined and works from
`file://`.

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
const raw    = await scrape('2026-08-10', '2026-08-16');  // new range only
const fresh  = clean(raw);
const merged = (await (await fetch('data.json')).json()).concat(fresh);
copy(JSON.stringify(merged));  // paste into data.json
```

4. Regenerate `dashboard.html` by inlining the new JSON into the standalone build.
5. Update the summary numbers at the top of this README and the date range in the
`META` object in `app.js`.

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
- `data.json` holds the cleaned 4,268 rows only. The 1,304 removed rows are not
preserved anywhere, so inspecting what was filtered out requires a re-scrape.
- Figures are disclosed bulk/block deal values, not total market turnover in a stock.

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry point, loads `app.js` + `data.json` |
| `app.js` | Styles, paginated table component, aggregation and rendering |
| `scrape.js` | Trendlyne scraper and the cleaning rules |
| `data.json` | The 4,268 cleaned deals |
| `dashboard.html` | Standalone single-file build (data inlined) |

## Disclaimer

Data belongs to Trendlyne / the exchanges and is included here only as a snapshot for
this analysis. Nothing here is investment advice.
