/*
 * Trendlyne bulk & block deals scraper
 * ------------------------------------
 * Paste this into the DevTools console while sitting on
 * https://trendlyne.com/portfolio/bulk-block-deals/all/
 * (you need to be logged in, the fetches reuse your session cookie).
 *
 * Trendlyne server-renders the ENTIRE result set for a date range into
 * #bbdealTable. The "pages" at the bottom are a client-side DataTables
 * widget slicing rows that are already in the document, so there is no
 * need to click through them - one fetch per day gets everything.
 *
 * We query ONE DAY AT A TIME because the free tier caps the number of
 * rows a single query will return.
 */

const BASE = 'https://trendlyne.com/portfolio/bulk-block-deals/all/';

function dayRange(fromISO, toISO) {
  const out = [], d = new Date(fromISO + 'T00:00:00'), end = new Date(toISO + 'T00:00:00');
  while (d <= end) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return out;
}

async function fetchDay(day) {
  const url = `${BASE}?defaultStockgroup=all&start_date=${day}&end_date=${day}`;
  const html = await (await fetch(url, { credentials: 'include' })).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('#bbdealTable');
  if (!table) return [];
  return [...table.querySelectorAll('tbody tr')].map(tr => {
    const c = [...tr.querySelectorAll('td')];
    if (c.length < 10) return null;
    const a = c[0].querySelector('a');
    return {
      day,
      stock:    a ? a.textContent.trim() : c[0].textContent.trim().split('\n')[0].trim(),
      client:   c[1].textContent.trim(),
      exch:     c[2].textContent.trim(),
      type:     c[3].textContent.trim(),   // Bulk | Block
      action:   c[4].textContent.trim(),   // Purchase | Sell
      price:    c[6].textContent.trim(),
      qty:      c[7].textContent.trim(),
      intraday: c[8].textContent.trim(),
      pct:      c[9].textContent.trim()
    };
  }).filter(Boolean);
}

async function scrape(fromISO, toISO) {
  const rows = [];
  for (const day of dayRange(fromISO, toISO)) {
    const got = await fetchDay(day);
    console.log(day, got.length);
    rows.push(...got);
  }
  return rows;
}

/* ---------------- cleaning ---------------- */

const num = s => Number(String(s).replace(/[^0-9.\-]/g, '')) || 0;

function clean(raw) {
  const rows = raw.map(r => ({ ...r, q: num(r.qty), p: num(r.price) }))
                  .map(r => ({ ...r, val: r.q * r.p }));

  // 1. drop matched round trips: same client, same stock, same day,
  //    bought AND sold the identical quantity (intraday market-maker churn)
  const groups = {};
  rows.forEach(r => {
    const k = r.day + '|' + r.client.toUpperCase() + '|' + r.stock.toUpperCase();
    (groups[k] = groups[k] || []).push(r);
  });
  Object.values(groups).forEach(g => {
    const buys = g.filter(r => r.action === 'Purchase');
    const sells = g.filter(r => r.action === 'Sell');
    const used = new Set();
    buys.forEach(b => {
      const i = sells.findIndex((s, idx) => !used.has(idx) && s.q === b.q);
      if (i >= 0) { used.add(i); b.drop = true; sells[i].drop = true; }
    });
  });

  // 2. drop feed duplicates: the identical trade reported once as Bulk
  //    and once as Block. Keep one, prefer the Block tag.
  const seen = {}, out = [];
  rows.filter(r => !r.drop).forEach(r => {
    const k = [r.day, r.stock, r.client, r.action, r.q, r.price, r.exch].join('|');
    if (seen[k]) { if (r.type === 'Block') seen[k].type = 'Block'; return; }
    seen[k] = r; out.push(r);
  });
  return out;
}

/* ---------------- run ---------------- */
// const raw   = await scrape('2026-07-01', '2026-08-09');
// const deals = clean(raw);
// copy(JSON.stringify(deals));   // then paste into data.json
