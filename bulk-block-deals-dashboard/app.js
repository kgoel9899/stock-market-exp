/*
 * Bulk & Block Deals Dashboard - renderer
 * --------------------------------------
 * Pure client-side. Give renderDashboard() an array of cleaned deal
 * objects and it builds the whole thing into <body>.
 *
 * Each deal object looks like:
 *   { day:'2026-07-01', stock:'Biocon', client:'MYLAN INC.', exch:'NSE',
 *     type:'Bulk', action:'Purchase'|'Sell', price:'411.25', qty:'12,37,34,524',
 *     intraday:'No', pct:'2.33%', q:123734524, p:411.25, val:q*p }
 *
 * See scrape.js for how those rows are produced.
 */

window.CSS_SRC = "\n*{box-sizing:border-box;margin:0;padding:0}\nbody{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0f1420;color:#e6ebf5;font-size:13px}\n.wrap{max-width:1480px;margin:0 auto;padding:22px}\nh1{font-size:23px;font-weight:700;letter-spacing:-.3px}\n.sub{color:#8b97ad;font-size:12.5px;margin-top:5px}\n.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}\n.kpi{background:#1a2133;border:1px solid #27314a;border-radius:10px;padding:13px 14px}\n.kpi .l{color:#8b97ad;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px}\n.kpi .v{font-size:21px;font-weight:700;margin-top:5px;font-variant-numeric:tabular-nums}\n.kpi .s{font-size:11px;color:#6f7c94;margin-top:2px}\n.tabs{display:flex;gap:6px;border-bottom:1px solid #27314a;margin-bottom:16px;flex-wrap:wrap}\n.tab{padding:9px 15px;cursor:pointer;color:#8b97ad;border-bottom:2px solid transparent;font-weight:600;font-size:12.5px}\n.tab.on{color:#5aa9ff;border-bottom-color:#5aa9ff}\n.card{background:#161c2b;border:1px solid #27314a;border-radius:10px;padding:16px;margin-bottom:16px}\n.card h2{font-size:14.5px;margin-bottom:3px}\n.card .cs{color:#8b97ad;font-size:11.5px;margin-bottom:12px}\ntable{width:100%;border-collapse:collapse;font-size:12.3px}\nth{text-align:right;padding:8px 9px;color:#8b97ad;font-weight:600;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #2c3650;cursor:pointer;white-space:nowrap;background:#161c2b}\nth:first-child,td:first-child{text-align:left}\nth.l,td.l{text-align:left}\ntd{padding:7px 9px;text-align:right;border-bottom:1px solid #1f2740;white-space:nowrap}\n.exact{font-variant-numeric:tabular-nums}\ntbody tr:hover{background:#1c2437}\n.pos{color:#3ddc84}.neg{color:#ff6b6b}.mut{color:#8b97ad}\ninput.search{background:#0f1420;border:1px solid #2c3650;color:#e6ebf5;padding:8px 11px;border-radius:7px;width:290px;font-size:12.5px}\nselect{background:#0f1420;border:1px solid #2c3650;color:#e6ebf5;padding:8px 10px;border-radius:7px;font-size:12.5px}\n.ctl{display:flex;gap:9px;margin-bottom:12px;align-items:center;flex-wrap:wrap}\n.pill{display:inline-block;padding:1px 7px;border-radius:20px;font-size:10.5px;font-weight:600}\n.pB{background:rgba(61,220,132,.14);color:#3ddc84}\n.pS{background:rgba(255,107,107,.14);color:#ff6b6b}\n.pBlk{background:rgba(160,120,255,.16);color:#b79bff}\n.note{background:#1a2133;border-left:3px solid #f0a500;padding:11px 14px;border-radius:0 8px 8px 0;color:#c9d3e6;font-size:12px;margin-bottom:16px;line-height:1.6}\n.hide{display:none}\n.miniflex{display:grid;grid-template-columns:1fr 1fr;gap:16px}\n.pg{display:flex;gap:6px;align-items:center;justify-content:space-between;margin-top:11px;flex-wrap:wrap;font-size:12px;color:#8b97ad}\n.pg .btns{display:flex;gap:4px;flex-wrap:wrap}\n.pg button{background:#1a2133;border:1px solid #2c3650;color:#c9d3e6;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px;min-width:32px}\n.pg button:hover:not(:disabled){background:#26304a;color:#fff}\n.pg button.cur{background:#2f6fd0;border-color:#2f6fd0;color:#fff;font-weight:700}\n.pg button:disabled{opacity:.35;cursor:default}\ntr.exp{cursor:pointer}\ntr.exp td:first-child::before{content:'\\25B8';color:#5aa9ff;display:inline-block;width:14px;font-size:11px}\ntr.exp.open td:first-child::before{content:'\\25BE'}\ntr.det>td{background:#10151f;padding:0 0 12px 22px;border-bottom:1px solid #2c3650}\ntr.det table{margin-top:6px}\ntr.det th{background:#10151f;font-size:10px}\nspan[title]{cursor:help}\n@media(max-width:1100px){.kpis{grid-template-columns:1fr}.miniflex{grid-template-columns:1fr}}\n";

function paginatedTable(mount, o) {
  const el = typeof mount === 'string' ? document.getElementById(mount) : mount;
  const uid = 'pt' + Math.random().toString(36).slice(2, 7);
  const sizes = o.sizes || [25, 50, 100, 250];
  let size = o.pageSize || 25, page = 1, q = '', sortI = (o.sortIdx != null ? o.sortIdx : null), dir = -1, view = o.rows.slice();

  el.innerHTML =
    '<div class="ctl"><input class="search" id="' + uid + 'q" placeholder="' + (o.placeholder || 'Search...') + '">' +
    '<select id="' + uid + 's">' + sizes.map(s => '<option value="' + s + '"' + (s === size ? ' selected' : '') + '>' + s + ' / page</option>').join('') + '</select>' +
    '<span class="mut" id="' + uid + 'c"></span></div>' +
    '<table id="' + uid + 't"><thead><tr>' + o.cols.map((c, i) => '<th class="' + (c.l ? 'l' : '') + '" data-i="' + i + '">' + c.h + '</th>').join('') + '</tr></thead><tbody></tbody></table>' +
    '<div class="pg" id="' + uid + 'p"></div>';

  const tb = () => el.querySelector('#' + uid + 't tbody');

  function apply() {
    view = q ? o.rows.filter(r => (o.text ? o.text(r) : '').toLowerCase().includes(q.toLowerCase())) : o.rows.slice();
    if (sortI != null) {
      const c = o.cols[sortI];
      view = view.slice().sort((a, b) => {
        const x = c.v(a), y = c.v(b);
        if (typeof x === 'string') return (x < y ? -1 : x > y ? 1 : 0) * (dir < 0 ? 1 : -1) * -1;
        return (y - x) * (dir < 0 ? 1 : -1);
      });
    }
    const mx = Math.max(1, Math.ceil(view.length / size));
    if (page > mx) page = mx;
    draw();
  }

  function draw() {
    const start = (page - 1) * size;
    tb().innerHTML = view.slice(start, start + size).map((r, i) =>
      '<tr class="' + (o.expand ? 'exp' : '') + '" data-i="' + (start + i) + '">' +
      o.cols.map(c => '<td class="' + (c.l ? 'l' : '') + ' exact">' + c.f(r) + '</td>').join('') + '</tr>').join('');
    el.querySelector('#' + uid + 'c').textContent = view.length === o.rows.length
      ? view.length.toLocaleString('en-IN') + ' rows'
      : view.length.toLocaleString('en-IN') + ' of ' + o.rows.length.toLocaleString('en-IN') + ' rows match';
    const mx = Math.max(1, Math.ceil(view.length / size)), nums = [];
    for (let p = 1; p <= mx; p++) {
      if (p === 1 || p === mx || (p >= page - 2 && p <= page + 2)) nums.push(p);
      else if (nums[nums.length - 1] !== '...') nums.push('...');
    }
    el.querySelector('#' + uid + 'p').innerHTML =
      '<span>Showing ' + (view.length ? (start + 1).toLocaleString('en-IN') : 0) + '-' + Math.min(page * size, view.length).toLocaleString('en-IN') + ' of ' + view.length.toLocaleString('en-IN') + '</span>' +
      '<span class="btns"><button data-p="1"' + (page === 1 ? ' disabled' : '') + '>&laquo; First</button>' +
      '<button data-p="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>&lsaquo; Prev</button>' +
      nums.map(n => n === '...' ? '<button disabled>...</button>' : '<button data-p="' + n + '"' + (n === page ? ' class="cur"' : '') + '>' + n + '</button>').join('') +
      '<button data-p="' + (page + 1) + '"' + (page === mx ? ' disabled' : '') + '>Next &rsaquo;</button>' +
      '<button data-p="' + mx + '"' + (page === mx ? ' disabled' : '') + '>Last &raquo;</button></span>';
    el.querySelectorAll('#' + uid + 'p button[data-p]').forEach(b => b.onclick = () => { page = +b.dataset.p; draw(); });
  }

  el.querySelectorAll('#' + uid + 't th').forEach(th => th.onclick = () => {
    const i = +th.dataset.i;
    if (sortI === i) dir = -dir; else { sortI = i; dir = -1; }
    page = 1; apply();
  });
  el.querySelector('#' + uid + 'q').oninput = e => { q = e.target.value.trim(); page = 1; apply(); };
  el.querySelector('#' + uid + 's').onchange = e => { size = +e.target.value; page = 1; draw(); };

  if (o.expand) tb().parentElement.addEventListener('click', ev => {
    const tr = ev.target.closest('tr.exp');
    if (!tr) return;
    const nxt = tr.nextElementSibling;
    if (nxt && nxt.classList.contains('det')) { nxt.remove(); tr.classList.remove('open'); return; }
    const det = document.createElement('tr');
    det.className = 'det';
    det.innerHTML = '<td colspan="' + o.cols.length + '">' + o.expand(view[+tr.dataset.i]) + '</td>';
    tr.after(det); tr.classList.add('open');
  });

  apply();
}

function buildDashboard(DEALS, meta) {
  meta = meta || {};
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const fn = v => v.toLocaleString('en-IN');
  const fcp = v => (v / 1e7).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fc = v => '<span title="\u20B9' + (Math.round(v * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '">' + fcp(v) + '</span>';
  const dfmt = d => { const p = d.split('-'); return p[2] + ' ' + MONTHS[+p[1] - 1]; };
  const wd = d => WD[new Date(d + 'T00:00:00').getDay()];
  const money = v => '<span class="' + (v >= 0 ? 'pos' : 'neg') + '">' + (v >= 0 ? '+' : '\u2212') + fcp(Math.abs(v)) + '</span>';
  const moneyC = v => '<span class="' + (v >= 0 ? 'pos' : 'neg') + '">' + (v >= 0 ? '+' : '\u2212') + '\u20B9' + fcp(Math.abs(v)) + 'cr</span>';

  // ---------- aggregate ----------
  const mk = () => ({ deals: 0, bq: 0, bv: 0, sq: 0, sv: 0, parties: new Set(), days: new Set() });
  const fin = o => ({ deals: o.deals, bq: o.bq, bv: o.bv, sq: o.sq, sv: o.sv, net: o.bv - o.sv, parties: o.parties.size, days: o.days.size });
  const S = {}, I = {}, D = {}, P = {}, rbs = {}, rbi = {}, rbd = {};
  DEALS.forEach(r => {
    const s = S[r.stock] = S[r.stock] || mk(), i = I[r.client] = I[r.client] || mk(),
          d = D[r.day] = D[r.day] || mk(), pk = r.stock + '\u0000' + r.client,
          p = P[pk] = P[pk] || mk();
    [s, i, d, p].forEach(o => {
      o.deals++;
      if (r.action === 'Purchase') { o.bq += r.q; o.bv += r.val; } else { o.sq += r.q; o.sv += r.val; }
      o.days.add(r.day);
    });
    s.parties.add(r.client); i.parties.add(r.stock); d.parties.add(r.stock); p.parties.add(r.day);
    (rbs[r.stock] = rbs[r.stock] || []).push(r);
    (rbi[r.client] = rbi[r.client] || []).push(r);
    (rbd[r.day] = rbd[r.day] || []).push(r);
  });
  const stocks = Object.entries(S).map(([k, v]) => Object.assign({ name: k }, fin(v)));
  const insts  = Object.entries(I).map(([k, v]) => Object.assign({ name: k }, fin(v)));
  const days   = Object.entries(D).map(([k, v]) => Object.assign({ name: k }, fin(v))).sort((a, b) => a.name < b.name ? -1 : 1);
  const pairs  = Object.entries(P).map(([k, v]) => Object.assign({ stock: k.split('\u0000')[0], inst: k.split('\u0000')[1] }, fin(v)));
  const pbs = {}, pbi = {};
  pairs.forEach(p => { (pbs[p.stock] = pbs[p.stock] || []).push(p); (pbi[p.inst] = pbi[p.inst] || []).push(p); });
  let BV = 0, SV = 0;
  DEALS.forEach(r => { if (r.action === 'Purchase') BV += r.val; else SV += r.val; });

  // ---------- shared cell renderers ----------
  const AC = r => r.action === 'Purchase' ? '<span class="pill pB">BUY</span>' : '<span class="pill pS">SELL</span>';
  const TY = r => r.type === 'Block' ? '<span class="pill pBlk">Block</span>' : '<span class="mut">Bulk</span>';
  const dealCols = extra => [extra].concat([
    { h: 'Exch', l: 1, f: r => '<span class="mut">' + r.exch + '</span>', v: r => r.exch },
    { h: 'Type', l: 1, f: TY, v: r => r.type },
    { h: 'Action', l: 1, f: AC, v: r => r.action },
    { h: 'Qty', f: r => fn(r.q), v: r => r.q },
    { h: 'Price \u20B9', f: r => r.price, v: r => r.p },
    { h: 'Value \u20B9cr', f: r => '<b>' + fc(r.val) + '</b>', v: r => r.val },
    { h: '% Traded', f: r => r.pct, v: r => parseFloat(r.pct) || 0 },
    { h: 'Intraday', f: r => r.intraday === 'Yes' ? '<span class="mut">Yes</span>' : '', v: r => r.intraday }
  ]);
  const dealTable = (rows, mode) => {
    rows = rows.slice().sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0) || (b.val - a.val));
    const head = mode === 'stock' ? '<th class="l">Institution / Client</th>' : '<th class="l">Stock</th>';
    return '<div class="cs" style="margin:8px 0 4px"><b>' + fn(rows.length) + '</b> individual deals \u00B7 most recent first</div>' +
      '<table><thead><tr><th class="l">Date</th>' + head + '<th class="l">Exch</th><th class="l">Type</th><th class="l">Action</th><th>Qty</th><th>Price \u20B9</th><th>Value \u20B9cr</th><th>% Traded</th><th>Intraday</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td class="l">' + dfmt(r.day) + '</td><td class="l">' + (mode === 'stock' ? r.client : '<b>' + r.stock + '</b>') +
        '</td><td class="l"><span class="mut">' + r.exch + '</span></td><td class="l">' + TY(r) + '</td><td class="l">' + AC(r) +
        '</td><td class="exact">' + fn(r.q) + '</td><td class="exact">' + r.price + '</td><td class="exact"><b>' + fc(r.val) +
        '</b></td><td>' + r.pct + '</td><td>' + (r.intraday === 'Yes' ? '<span class="mut">Yes</span>' : '') + '</td></tr>').join('') +
      '</tbody></table>';
  };
  const childTable = (kids, key, label) =>
    '<div class="cs" style="margin:8px 0 4px"><b>' + kids.length + '</b> ' + label + ' \u00B7 sorted by turnover</div>' +
    '<table><thead><tr><th class="l">' + (label === 'institutions' ? 'Institution / Client' : 'Stock') + '</th><th>Deals</th><th>Days</th><th>Buy Qty</th><th>Buy \u20B9cr</th><th>Sell Qty</th><th>Sell \u20B9cr</th><th>Net \u20B9cr</th></tr></thead><tbody>' +
    kids.slice().sort((a, b) => (b.bv + b.sv) - (a.bv + a.sv)).map(k =>
      '<tr><td class="l">' + k[key] + '</td><td class="exact">' + k.deals + '</td><td class="exact">' + k.days +
      '</td><td class="exact">' + (k.bq ? fn(k.bq) : '\u2014') + '</td><td class="exact">' + (k.bv ? fc(k.bv) : '\u2014') +
      '</td><td class="exact">' + (k.sq ? fn(k.sq) : '\u2014') + '</td><td class="exact">' + (k.sv ? fc(k.sv) : '\u2014') +
      '</td><td class="exact">' + money(k.net) + '</td></tr>').join('') + '</tbody></table>';

  window.__dash = { stocks, insts, days, pairs, rbs, rbi, rbd, pbs, pbi };
  return { stocks, insts, days, pairs, rbs, rbi, rbd, pbs, pbi, BV, SV, fn, fc, fcp, dfmt, wd, money, moneyC, dealTable, childTable, dealCols, AC, TY, meta };
}

function renderDashboard(DEALS, meta) {
  const X = buildDashboard(DEALS, meta);
  const { stocks, insts, days, rbs, rbi, rbd, pbs, pbi, BV, SV, fn, fc, fcp, dfmt, wd, money, moneyC, dealTable, childTable } = X;
  meta = meta || {};

  document.head.innerHTML = '<meta charset="utf-8"><title>' + (meta.title || 'Bulk & Block Deals Dashboard') + '</title>';
  const st = document.createElement('style'); st.textContent = window.CSS_SRC; document.head.appendChild(st);

  const kpi = (l, v, s) => '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + (s || '') + '</div></div>';
  const TABS = [['ov', 'Overview'], ['st', 'By Stock'], ['in', 'By Institution'], ['gs', 'Stock \u2192 Institutions'], ['gi', 'Institution \u2192 Stocks'], ['dy', 'Daily'], ['dl', 'All Deals']];

  document.body.innerHTML = '<div class="wrap">' +
    '<h1>' + (meta.title || 'Bulk &amp; Block Deals Dashboard') + '</h1>' +
    '<div class="sub">' + (meta.sub || '') + '</div>' +
    '<div class="kpis">' +
      kpi('Qualifying deals', fn(DEALS.length), meta.rawNote || '') +
      kpi('Stocks', fn(stocks.length), 'unique scrips') +
      kpi('Institutions', fn(insts.length), 'unique client names') +
      kpi('Buy value', '\u20B9' + fcp(BV) + 'cr', '\u20B9' + Math.round(BV).toLocaleString('en-IN')) +
      kpi('Sell value', '\u20B9' + fcp(SV) + 'cr', '\u20B9' + Math.round(SV).toLocaleString('en-IN')) +
      kpi('Turnover', '\u20B9' + fcp(BV + SV) + 'cr', 'buy + sell') +
    '</div>' +
    (meta.note ? '<div class="note">' + meta.note + '</div>' : '') +
    '<div class="tabs">' + TABS.map((t, i) => '<div class="tab' + (i ? '' : ' on') + '" data-p="' + t[0] + '">' + t[1] + '</div>').join('') + '</div>' +
    '<div id="panes">' + TABS.map((t, i) => '<div class="pane' + (i ? ' hide' : '') + '" id="p_' + t[0] + '"></div>').join('') + '</div></div>';

  document.querySelectorAll('.tab').forEach(el => el.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('on')); el.classList.add('on');
    document.querySelectorAll('.pane').forEach(x => x.classList.add('hide'));
    document.getElementById('p_' + el.dataset.p).classList.remove('hide');
  });

  const aggCols = (firstHead, childHead) => [
    { h: firstHead, l: 1, f: r => '<b>' + r.name + '</b>', v: r => r.name },
    { h: 'Deals', f: r => fn(r.deals), v: r => r.deals },
    { h: childHead, f: r => fn(r.parties), v: r => r.parties },
    { h: 'Days', f: r => r.days, v: r => r.days },
    { h: 'Buy Qty', f: r => fn(r.bq), v: r => r.bq },
    { h: 'Buy \u20B9cr', f: r => fc(r.bv), v: r => r.bv },
    { h: 'Sell Qty', f: r => fn(r.sq), v: r => r.sq },
    { h: 'Sell \u20B9cr', f: r => fc(r.sv), v: r => r.sv },
    { h: 'Net \u20B9cr', f: r => money(r.net), v: r => r.net },
    { h: 'Turnover \u20B9cr', f: r => fc(r.bv + r.sv), v: r => r.bv + r.sv }
  ];

  // ---- By Stock ----
  document.getElementById('p_st').innerHTML = '<div class="card"><h2>Deals grouped by stock</h2><div class="cs">' + stocks.length +
    ' scrips \u00B7 <b>click any stock to list every deal executed on it</b> \u00B7 search and sort run over the whole dataset, then results are paged \u00B7 values in \u20B9 crore, exact to 2 decimals (hover for the precise rupee amount)</div><div id="mStock"></div></div>';
  paginatedTable('mStock', { rows: stocks, sortIdx: 9, pageSize: 25, placeholder: 'Search all stocks...', text: r => r.name,
    cols: aggCols('Stock', 'Institutions'), expand: r => dealTable(rbs[r.name] || [], 'stock') });

  // ---- By Institution ----
  document.getElementById('p_in').innerHTML = '<div class="card"><h2>Deals grouped by institution</h2><div class="cs">' + insts.length +
    ' unique client names \u00B7 <b>click any institution to list every deal it executed</b></div><div id="mInst"></div></div>';
  paginatedTable('mInst', { rows: insts, sortIdx: 9, pageSize: 25, placeholder: 'Search all institutions...', text: r => r.name,
    cols: aggCols('Institution / Client', 'Stocks'), expand: r => dealTable(rbi[r.name] || [], 'inst') });

  // ---- grouped tabs ----
  const grpCols = (h1, h2) => [
    { h: h1, l: 1, f: r => '<b>' + r.name + '</b>', v: r => r.name },
    { h: h2, f: r => fn(r.parties), v: r => r.parties },
    { h: 'Deals', f: r => fn(r.deals), v: r => r.deals },
    { h: 'Days', f: r => r.days, v: r => r.days },
    { h: 'Buy \u20B9cr', f: r => fc(r.bv), v: r => r.bv },
    { h: 'Sell \u20B9cr', f: r => fc(r.sv), v: r => r.sv },
    { h: 'Net \u20B9cr', f: r => money(r.net), v: r => r.net },
    { h: 'Turnover \u20B9cr', f: r => fc(r.bv + r.sv), v: r => r.bv + r.sv }
  ];
  document.getElementById('p_gs').innerHTML = '<div class="card"><h2>Every stock, broken down by the institutions that traded it</h2><div class="cs">' +
    stocks.length + ' groups \u00B7 <b>click a row to expand</b> \u00B7 the search also looks inside each group</div><div id="mGS"></div></div>';
  paginatedTable('mGS', { rows: stocks, sortIdx: 7, pageSize: 25, placeholder: 'Search...',
    text: r => r.name + ' ' + (pbs[r.name] || []).map(k => k.inst).join(' '),
    cols: grpCols('Stock', 'Institutions'), expand: r => childTable(pbs[r.name] || [], 'inst', 'institutions') });
  document.getElementById('p_gi').innerHTML = '<div class="card"><h2>Every institution, broken down by the stocks it traded</h2><div class="cs">' +
    insts.length + ' groups \u00B7 <b>click a row to expand</b></div><div id="mGI"></div></div>';
  paginatedTable('mGI', { rows: insts, sortIdx: 7, pageSize: 25, placeholder: 'Search...',
    text: r => r.name + ' ' + (pbi[r.name] || []).map(k => k.stock).join(' '),
    cols: grpCols('Institution / Client', 'Stocks'), expand: r => childTable(pbi[r.name] || [], 'stock', 'stocks') });

  // ---- Daily ----
  document.getElementById('p_dy').innerHTML = '<div class="card"><h2>Day-by-day activity</h2><div class="cs">' + days.length +
    ' trading days \u00B7 <b>click any date to open every deal reported that day</b> \u00B7 the day list and each day\u2019s deal list are separately paged; searching looks through all deals on all days</div><div id="mDay"></div></div>';
  paginatedTable('mDay', {
    rows: days, sortIdx: 0, pageSize: 25, sizes: [10, 25, 50], placeholder: 'Search a date, stock or institution across all days...',
    text: r => r.name + ' ' + dfmt(r.name) + ' ' + (rbd[r.name] || []).map(x => x.stock + ' ' + x.client).join(' '),
    cols: [
      { h: 'Date', l: 1, f: r => '<b>' + dfmt(r.name) + '</b> <span class="mut">' + wd(r.name) + '</span>', v: r => r.name },
      { h: 'Deals', f: r => fn(r.deals), v: r => r.deals },
      { h: 'Stocks', f: r => fn(r.parties), v: r => r.parties },
      { h: 'Buy \u20B9cr', f: r => fc(r.bv), v: r => r.bv },
      { h: 'Sell \u20B9cr', f: r => fc(r.sv), v: r => r.sv },
      { h: 'Net \u20B9cr', f: r => money(r.net), v: r => r.net },
      { h: 'Turnover \u20B9cr', f: r => fc(r.bv + r.sv), v: r => r.bv + r.sv }],
    expand: r => {
      const id = 'dd' + r.name.replace(/-/g, '');
      setTimeout(() => {
        const m = document.getElementById(id);
        if (!m || m.dataset.done) return;
        m.dataset.done = 1;
        paginatedTable(m, {
          rows: (rbd[r.name] || []).slice().sort((a, b) => b.val - a.val), sortIdx: 7, pageSize: 25, sizes: [10, 25, 50, 100],
          placeholder: 'Filter this day...', text: x => x.stock + ' ' + x.client + ' ' + x.exch + ' ' + x.type + ' ' + x.action,
          cols: [{ h: 'Stock', l: 1, f: x => '<b>' + x.stock + '</b>', v: x => x.stock },
                 { h: 'Institution / Client', l: 1, f: x => x.client, v: x => x.client }].concat(X.dealCols({ h: '', f: () => '' }).slice(1))
        });
      }, 0);
      return '<div class="cs" style="margin:8px 0 2px"><b>' + fn(r.deals) + '</b> deals on ' + dfmt(r.name) + ' \u00B7 buy \u20B9' + fcp(r.bv) + 'cr \u00B7 sell \u20B9' + fcp(r.sv) + 'cr</div><div id="' + id + '"></div>';
    }
  });

  // ---- All Deals ----
  document.getElementById('p_dl').innerHTML = '<div class="card"><h2>All qualifying deals</h2><div class="cs">' + fn(DEALS.length) +
    ' rows \u00B7 search runs across every row in the dataset, then results are paged</div><div id="mDeals"></div></div>';
  paginatedTable('mDeals', {
    rows: DEALS, sortIdx: 0, pageSize: 50, placeholder: 'Search stock, institution, date, exchange...',
    text: r => r.stock + ' ' + r.client + ' ' + r.day + ' ' + dfmt(r.day) + ' ' + r.exch + ' ' + r.type + ' ' + r.action,
    cols: [{ h: 'Date', l: 1, f: r => dfmt(r.day), v: r => r.day },
           { h: 'Stock', l: 1, f: r => '<b>' + r.stock + '</b>', v: r => r.stock },
           { h: 'Institution / Client', l: 1, f: r => r.client, v: r => r.client }].concat(X.dealCols({ h: '', f: () => '' }).slice(1))
  });

  // ---- Overview ----
  const mini = (title, sub, rows, cols) => '<div class="card"><h2>' + title + '</h2><div class="cs">' + sub + '</div><table><thead><tr>' +
    cols.map(c => '<th class="' + (c.l ? 'l' : '') + '">' + c.h + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + cols.map(c => '<td class="' + (c.l ? 'l' : '') + ' exact">' + c.f(r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const byNet = stocks.slice().sort((a, b) => b.net - a.net), instNet = insts.slice().sort((a, b) => b.net - a.net);
  const sc = [{ h: 'Stock', l: 1, f: r => '<b>' + r.name + '</b>' }, { h: 'Deals', f: r => r.deals }, { h: 'Instns', f: r => r.parties }, { h: 'Net \u20B9cr', f: r => moneyC(r.net) }];
  const ic = [{ h: 'Institution', l: 1, f: r => '<b>' + r.name + '</b>' }, { h: 'Deals', f: r => r.deals }, { h: 'Stocks', f: r => r.parties }, { h: 'Net \u20B9cr', f: r => moneyC(r.net) }];
  const topCols = first => [{ h: first, l: 1, f: r => '<b>' + r.name + '</b>' }, { h: 'Deals', f: r => r.deals },
    { h: first === 'Stock' ? 'Instns' : 'Stocks', f: r => r.parties }, { h: 'Days', f: r => r.days },
    { h: 'Buy \u20B9cr', f: r => fc(r.bv) }, { h: 'Sell \u20B9cr', f: r => fc(r.sv) },
    { h: 'Turnover \u20B9cr', f: r => '<b>' + fcp(r.bv + r.sv) + '</b>' }, { h: 'Net \u20B9cr', f: r => moneyC(r.net) }];
  document.getElementById('p_ov').innerHTML =
    mini('Most active stocks by turnover', 'Buy + sell value of all qualifying deals \u00B7 full breakdowns in the By Stock tab', stocks.slice().sort((a, b) => (b.bv + b.sv) - (a.bv + a.sv)).slice(0, 15), topCols('Stock')) +
    '<div class="miniflex">' +
      mini('Strongest net accumulation \u2014 stocks', 'Buy value most exceeded sell value', byNet.slice(0, 12), sc) +
      mini('Strongest net distribution \u2014 stocks', 'Sell value most exceeded buy value', byNet.slice(-12).reverse(), sc) +
      mini('Biggest net buyers', 'Institutions with the largest net purchase value', instNet.slice(0, 12), ic) +
      mini('Biggest net sellers', 'Institutions with the largest net sale value', instNet.slice(-12).reverse(), ic) +
    '</div>' +
    mini('Most active institutions by turnover', 'Excludes matched same-day same-quantity round trips', insts.slice().sort((a, b) => (b.bv + b.sv) - (a.bv + a.sv)).slice(0, 15), topCols('Institution / Client')) +
    mini('Single largest deals in the period', 'Individual bulk / block transactions by value', DEALS.slice().sort((a, b) => b.val - a.val).slice(0, 15),
      [{ h: 'Date', l: 1, f: r => dfmt(r.day) }, { h: 'Stock', l: 1, f: r => '<b>' + r.stock + '</b>' },
       { h: 'Institution / Client', l: 1, f: r => r.client }, { h: 'Type', l: 1, f: r => r.type },
       { h: 'Action', l: 1, f: r => X.AC(r) }, { h: 'Qty', f: r => fn(r.q) }, { h: 'Price \u20B9', f: r => r.price },
       { h: 'Value \u20B9cr', f: r => '<b>' + fc(r.val) + '</b>' }]);
}
