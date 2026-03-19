/* ─────────────────────────────────────────────────────────────────
   HSP — Halal Stock Predictions · Frontend App
   Data: Yahoo Finance direct. RL model runs in-browser via ONNX.
   No backend server needed.
───────────────────────────────────────────────────────────────── */

// ── Config ─────────────────────────────────────────────────────────
const CORS_PROXIES = [
  url => `https://shy-mode-a0b0.mohibamin786.workers.dev/?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function corsGet(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(proxy(url), { signal: controller.signal });
      clearTimeout(timer);
      return res; // return any response — let caller check status
    } catch (_) {}
  }
  throw new Error(`All CORS proxies failed for: ${url}`);
}

// Yahoo Finance endpoints
const YF_CHART_URL = (ticker, range = "1y", interval = "1d") =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`;
const YF_QUOTE_URL = (symbols) =>
  `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;

// Macro tickers: VIX, 10Y yield, DXY, Gold, Oil, SPY
const MACRO_TICKERS = {
  "^VIX":  { name: "VIX Fear Index",   unit: "",  good_low: true  },
  "^TNX":  { name: "10Y Yield",         unit: "%", good_low: false },
  "DX-Y.NYB": { name: "USD (DXY)",      unit: "",  good_low: false },
  "GC=F":  { name: "Gold",              unit: "$", good_low: false },
  "CL=F":  { name: "Oil (WTI)",         unit: "$", good_low: false },
  "SPY":   { name: "S&P 500 (SPY)",     unit: "$", good_low: false },
  "QQQ":   { name: "Nasdaq (QQQ)",      unit: "$", good_low: false },
  "^GSPC": { name: "S&P 500 Index",     unit: "",  good_low: false },
};

// ── Plotly layout ───────────────────────────────────────────────────
const PLOT_LAYOUT = {
  template: "plotly_dark", paper_bgcolor: "#100c15", plot_bgcolor: "#08060b",
  font: { color: "#f0e8ec", size: 12, family: "Inter, system-ui, sans-serif" },
  margin: { l: 50, r: 20, t: 30, b: 40 },
  legend: { orientation: "h", y: 1.1 },
  hovermode: "x unified",
  xaxis: { gridcolor: "rgba(255,255,255,0.05)", zerolinecolor: "rgba(255,255,255,0.1)" },
  yaxis: { gridcolor: "rgba(255,255,255,0.05)", zerolinecolor: "rgba(255,255,255,0.1)" },
};
const PLOT_CONFIG = { displayModeBar: false, responsive: true };

const SENT_COLORS = {
  "BULLISH":          { fg: "#dc143c", bg: "rgba(220,20,60,0.08)" },
  "SLIGHTLY BULLISH": { fg: "#ff4d6d", bg: "rgba(255,77,109,0.08)" },
  "NEUTRAL":          { fg: "#8a7f82", bg: "rgba(138,127,130,0.08)" },
  "SLIGHTLY BEARISH": { fg: "#ff6b35", bg: "rgba(255,107,53,0.08)" },
  "BEARISH":          { fg: "#cc0022", bg: "rgba(204,0,34,0.08)" },
};

// ── State ───────────────────────────────────────────────────────────
let _spyData        = null;   // { dates, close, ema50, regime, price, ema }
let _signals        = null;   // array of signal objects
let _stockDataCache = {};     // raw OHLCV cache reused by RL model
let _signalsLoaded  = false;
let _newsLoaded     = false;
let _backtestLoaded = false;
let _macroCache     = {};     // { vix, yield10y, dxy }

// ───────────────────────────────────────────────────────────────────
//  DISCLAIMERS
// ───────────────────────────────────────────────────────────────────
function initDisclaimers() {
  if (!localStorage.getItem("hsp_halal_dismissed"))
    document.getElementById("disclaimer-halal").style.display = "flex";
  if (!localStorage.getItem("hsp_invest_dismissed"))
    document.getElementById("disclaimer-invest").style.display = "flex";
}
function dismissDisclaimer(key) {
  localStorage.setItem(`hsp_${key}_dismissed`, "1");
  document.getElementById(`disclaimer-${key}`).style.display = "none";
}

// ───────────────────────────────────────────────────────────────────
//  TAB SWITCHING
// ───────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelector(`[data-tab="${name}"]`).classList.add("active");
  document.getElementById(`tab-${name}`).classList.add("active");

  if (name === "backtest"    && !_backtestLoaded) loadBacktest();
  if (name === "predictions" && !_newsLoaded)     loadNews();
  if (name === "rl-advisor"  && _spyData)         loadRlAdvisor();
  if (name === "watchlist") {
    if (!_signalsLoaded) loadWatchlist();
    const sel = document.getElementById("stock-select");
    if (sel?.value) loadStockChart(sel.value);
  }
}

// ───────────────────────────────────────────────────────────────────
//  HELPERS
// ───────────────────────────────────────────────────────────────────
function fmt$(n)         { return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtPct(n, sign) { return (sign && n > 0 ? "+" : "") + Number(n).toFixed(2) + "%"; }
function spinner(msg)    { return `<span class="spinner"></span>${msg}`; }

function buildTable(headers, rows, cellClassFn) {
  const ths = headers.map(h => `<th>${h}</th>`).join("");
  const trs = rows.map(row => {
    const tds = row.map((cell, i) => {
      const cls = cellClassFn ? cellClassFn(cell, i) : "";
      return `<td class="${cls}">${cell ?? "—"}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function signalClass(s) {
  return s === "BUY" ? "signal-buy" : s === "SELL" ? "signal-sell" : "signal-hold";
}

// Fetch Yahoo Finance chart for one ticker → returns { dates[], close[], high[], low[], volume[] }
async function fetchYFChart(ticker, range = "1y") {
  const res  = await corsGet(YF_CHART_URL(ticker, range));
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${ticker}`);
  const ts    = result.timestamp;
  const quote = result.indicators.quote[0];
  return {
    dates:  ts.map(t => new Date(t * 1000).toISOString().slice(0, 10)),
    close:  quote.close,
    high:   quote.high,
    low:    quote.low,
    volume: quote.volume,
  };
}

// Fetch batch quotes for multiple tickers → returns Map<ticker, {price, prevClose}>
async function fetchYFQuotes(tickers) {
  const res  = await corsGet(YF_QUOTE_URL(tickers));
  const json = await res.json();
  const map  = new Map();
  for (const q of json?.quoteResponse?.result ?? []) {
    map.set(q.symbol, {
      price:     q.regularMarketPrice ?? q.ask ?? 0,
      prevClose: q.regularMarketPreviousClose ?? 0,
      chgPct:    q.regularMarketChangePercent ?? 0,
    });
  }
  return map;
}

// Market status (pure JS, no API needed)
function getMarketStatus() {
  const now = new Date();
  const et  = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();  // 0=Sun,6=Sat
  const h = et.getHours(), m = et.getMinutes();
  const mins = h * 60 + m;

  if (day === 0 || day === 6) return { status: "CLOSED",      label: "Weekend" };
  if (mins < 240)             return { status: "CLOSED",      label: "Overnight" };
  if (mins < 570)             return { status: "PRE-MARKET",  label: "Pre-Market" };
  if (mins <= 960)            return { status: "OPEN",        label: "Market Open" };
  if (mins <= 1200)           return { status: "AFTER-HOURS", label: "After Hours" };
  return { status: "CLOSED", label: "Closed" };
}

// ───────────────────────────────────────────────────────────────────
//  SIDEBAR + DASHBOARD STATUS
// ───────────────────────────────────────────────────────────────────
async function loadStatus() {
  // Market status badge
  const ms = getMarketStatus();
  const badgeColors = { OPEN: "#dc143c", "PRE-MARKET": "#ff6b35", "AFTER-HOURS": "#ff6b35", CLOSED: "#8a7f82" };
  const badgeIcons  = { OPEN: "🟢", "PRE-MARKET": "🌅", "AFTER-HOURS": "🌙", CLOSED: "🔴" };
  const c = badgeColors[ms.status];
  const badge = document.getElementById("market-badge");
  badge.style.cssText = `background:${c}22; border:1px solid ${c}; padding:10px 12px; border-radius:8px`;
  const etStr = new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" });
  document.getElementById("market-badge-title").innerHTML = `<span style="color:${c};font-weight:700">${badgeIcons[ms.status]} ${ms.label}</span>`;
  document.getElementById("market-badge-sub").textContent = `${etStr} ET`;

  // Stock count
  document.getElementById("n-stocks").textContent = Object.keys(WATCHLIST).length;
  document.getElementById("signals-caption").textContent =
    `Fetches live prices for all ${Object.keys(WATCHLIST).length} stocks — takes ~15 seconds on first load.`;

  // SPY data
  try {
    await loadSpyData();
  } catch (e) {
    console.warn("SPY load failed:", e);
    document.getElementById("spy-price").textContent = "unavailable";
    document.getElementById("spy-ema").textContent   = "unavailable";
    document.getElementById("ema-gap").textContent   = "unavailable";
    document.getElementById("regime-banner").innerHTML =
      `<span style="color:#ff6b35">⚠ Live data unavailable — Yahoo Finance CORS proxy failed. Try refreshing.</span>`;
  }

  document.getElementById("last-refresh").textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
  if (ms.status === "OPEN") setTimeout(loadStatus, 300_000);
}

// ───────────────────────────────────────────────────────────────────
//  SPY DATA + REGIME
// ───────────────────────────────────────────────────────────────────
async function loadSpyData() {
  const d     = await fetchYFChart("SPY", "6mo");
  const close = d.close.filter(v => v != null);
  const dates = d.dates.slice(-close.length);

  // EMA50
  const ema50Series = close.map((_, i) => {
    const slice = close.slice(0, i + 1);
    return calcEMA(slice, Math.min(50, slice.length));
  });
  const ema50 = ema50Series[ema50Series.length - 1];
  const price = close[close.length - 1];
  const gap   = (price / ema50 - 1) * 100;
  const regime = gap > 2 ? "BULL" : gap < -2 ? "BEAR" : "NEUTRAL";

  _spyData = { dates, close, ema50Series, price, ema50, gap, regime };

  // Dashboard metrics
  document.getElementById("spy-price").textContent   = fmt$(price);
  document.getElementById("spy-ema").textContent     = fmt$(ema50);
  document.getElementById("spy-ema-delta").textContent = fmtPct(gap, true);
  document.getElementById("spy-ema-delta").className = "metric-delta " + (gap >= 0 ? "delta-up" : "delta-down");
  document.getElementById("ema-gap").textContent     = fmtPct(gap, true);
  document.getElementById("ema-gap").style.color     = gap >= 0 ? "#dc143c" : "#ff4d6d";
  document.getElementById("ema-gap-delta").textContent = gap >= 0 ? "Above EMA" : "Below EMA";
  document.getElementById("ema-gap-delta").className = "metric-delta " + (gap >= 0 ? "delta-up" : "delta-down");

  // Regime banner
  const rc = { BULL: "#dc143c", NEUTRAL: "#ff6b35", BEAR: "#ff4d6d" }[regime];
  const ri = { BULL: "●", NEUTRAL: "●", BEAR: "●" }[regime];
  const bearNote = regime === "BEAR"
    ? `<div class="bear-note">⚠️ Bear market — RL agent will not open new positions. Hold cash.</div>` : "";
  const regimeBanner = document.getElementById("regime-banner");
  regimeBanner.innerHTML = `<span style="color:${rc}">${ri} MARKET REGIME: ${regime}</span>
    <span class="regime-sub">SPY ${fmt$(price)} vs 50d EMA ${fmt$(ema50)}</span>${bearNote}`;
  regimeBanner.style.cssText = `background:${rc}22; border:2px solid ${rc}; border-radius:10px; padding:14px 20px; margin-bottom:16px`;

  // RL advisor state
  renderRlRegimeState(regime, price, ema50, gap);

  // SPY chart
  renderSpyChart(dates, close, ema50Series);
}

function renderSpyChart(dates, close, ema50Series) {
  const allVals = [...close, ...ema50Series].filter(v => v != null);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const pad  = (maxV - minV) * 0.05;

  // Bear-fill: shade between close and ema where close < ema
  const bearFillX = [], bearFillY = [];
  dates.forEach((d, i) => {
    if (close[i] != null && ema50Series[i] != null && close[i] < ema50Series[i]) {
      bearFillX.push(d); bearFillY.push(close[i]);
    }
  });

  Plotly.newPlot("spy-chart", [
    { x: dates, y: close,       name: "SPY Close", line: { color: "#dc143c", width: 2 }, type: "scatter", mode: "lines" },
    { x: dates, y: ema50Series, name: "50d EMA",   line: { color: "#ff4d6d", width: 2, dash: "dash" }, type: "scatter", mode: "lines" },
  ], {
    ...PLOT_LAYOUT,
    height: 340,
    yaxis: {
      title: "Price ($)",
      range: [minV - pad, maxV + pad],
      gridcolor: "rgba(255,255,255,0.05)",
    },
  }, PLOT_CONFIG);
}

// ───────────────────────────────────────────────────────────────────
//  WATCHLIST SIGNALS  (computed entirely in JS from Yahoo Finance)
// ───────────────────────────────────────────────────────────────────
async function loadWatchlist() {
  if (_signalsLoaded) { renderWatchlist(); return; }

  const loading = document.getElementById("watchlist-loading");
  loading.style.display = "block";
  document.getElementById("watchlist-table").style.display = "none";

  const tickers = Object.keys(WATCHLIST);
  const results = [];
  const BATCH   = 20;

  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    loading.textContent = `Loading signals… ${Math.min(i + BATCH, tickers.length)} / ${tickers.length}`;

    await Promise.all(batch.map(async ticker => {
      try {
        const d   = await fetchYFChart(ticker, "1y");
        const cls = d.close.filter(v => v != null && isFinite(v));
        if (cls.length < 30) return;
        _stockDataCache[ticker] = d;   // cache raw OHLCV for RL inference
        const sig = generateSignal(ticker, cls);
        results.push({
          ...sig,
          company: WATCHLIST[ticker].name,
          sector:  WATCHLIST[ticker].sector,
          monitor: MONITOR_LIST.has(ticker),
          hold: "2–4 wks",
          hold_rationale: "",
        });
      } catch (_) {}
    }));
  }

  // Sort: BUY → HOLD → SELL, then by confidence desc
  const order = { BUY: 0, HOLD: 1, SELL: 2 };
  results.sort((a, b) => (order[a.signal] - order[b.signal]) || (b.confidence - a.confidence));

  _signals = results;
  _signalsLoaded = true;

  // Populate filters
  const sortedSectors = [...new Set(results.map(r => r.sector).filter(Boolean))].sort();
  const sectors = ["All", ...sortedSectors];
  const sectorSel = document.getElementById("sector-filter");
  sectorSel.innerHTML = sectors.map(s => `<option value="${s}"${s === "All" ? " selected" : ""}>${s}</option>`).join("");
  sectorSel.onchange = filterWatchlist;
  document.querySelectorAll(".signal-filter").forEach(cb => cb.onchange = filterWatchlist);

  // Stock dropdown
  const stockSel = document.getElementById("stock-select");
  stockSel.innerHTML = tickers.sort().map(t => `<option value="${t}">${t}</option>`).join("");
  loadStockChart(tickers[0]);

  loading.style.display = "none";
  renderWatchlist();
  renderQuickBuyPlanner();
}

function renderWatchlist() {
  if (!_signals) return;
  const selectedSigs = [...document.querySelectorAll(".signal-filter:checked")].map(c => c.value);
  const selectedSec  = document.getElementById("sector-filter").value;
  const minConf      = parseInt(document.getElementById("conf-slider").value, 10);

  const filtered = _signals.filter(r =>
    selectedSigs.includes(r.signal) &&
    (selectedSec === "All" || r.sector === selectedSec) &&
    r.confidence >= minConf
  );

  document.getElementById("watchlist-table").innerHTML = buildTable(
    ["Ticker", "Company", "Sector", "Price", "Signal", "Conf %", "RSI", "Stop ($)", "Target ($)", "R:R", "⚠️"],
    filtered.map(r => [
      r.ticker, r.company, r.sector, fmt$(r.price),
      r.signal, r.confidence.toFixed(1) + "%", r.rsi,
      r.stop   ? fmt$(r.stop)   : "—",
      r.target ? fmt$(r.target) : "—",
      r.rr || "—", r.monitor ? "⚠️" : "",
    ]),
    (val, i) => i === 4 ? signalClass(val) : ""
  );
  document.getElementById("watchlist-table").style.display = "block";

  document.getElementById("watchlist-caption").textContent =
    `Showing ${filtered.length} of ${_signals.length} stocks  |  Stop −5% / Target +12% / R:R 1:2.4`;

  // Hold rationale expander for BUY signals
  const buys = filtered.filter(r => r.signal === "BUY");
  const exp  = document.getElementById("hold-rationale-expander");
  exp.style.display = buys.length > 0 ? "block" : "none";
  if (buys.length > 0) {
    document.getElementById("hold-rationale-title").textContent = `Hold duration rationale — ${buys.length} BUY signal(s)`;
    document.getElementById("hold-rationale-body").innerHTML = buys.map(r => `
      <div class="rationale-item">
        <div class="rationale-ticker">${r.ticker} · ${r.company} · ${r.sector}</div>
        <div class="rationale-meta">Confidence: <strong>${r.confidence.toFixed(1)}%</strong> &nbsp;|&nbsp; RSI: ${r.rsi} &nbsp;|&nbsp; Score: ${r.score}/12</div>
      </div>`).join("");
  }
}

function filterWatchlist() { renderWatchlist(); }

function renderQuickBuyPlanner() {
  if (!_signals) return;
  const buys = _signals.filter(r => r.signal === "BUY");
  const exp  = document.getElementById("qbp-expander");
  if (buys.length === 0) { exp.style.display = "none"; return; }
  const cash = parseFloat(document.getElementById("cash-input").value) || 10000;
  exp.style.display = "block";
  document.getElementById("qbp-title").textContent = `Quick Buy Planner — allocate ${fmt$(cash)} across ${buys.length} BUY signals`;

  const perStock = cash / buys.length;
  const rows = buys.map(r => {
    const shares = Math.floor(perStock / r.price);
    return [r.ticker, r.company, fmt$(r.price), shares, fmt$(shares * r.price),
            r.stop ? fmt$(r.stop) : "—", r.target ? fmt$(r.target) : "—", "1:2.4", r.confidence.toFixed(1) + "%"];
  });
  const spent = rows.reduce((s, r) => s + parseFloat(r[4].replace(/[$,]/g, "")), 0);
  document.getElementById("qbp-body").innerHTML =
    buildTable(["Ticker", "Company", "Price", "Shares", "Cost", "Stop", "Target", "R:R", "Conf %"], rows) +
    `<p class="caption" style="margin-top:8px">Cash remaining: ${fmt$(cash - spent)}</p>`;
}

// ── Signal Snapshot (Dashboard) ─────────────────────────────────────
async function loadSignalSnapshot() {
  const btn = document.getElementById("load-signals-btn");
  btn.disabled = true;
  btn.innerHTML = spinner("Fetching signals…");
  try {
    if (!_signalsLoaded) await loadWatchlist();
    const buy  = _signals.filter(r => r.signal === "BUY");
    const hold = _signals.filter(r => r.signal === "HOLD");
    const sell = _signals.filter(r => r.signal === "SELL");
    document.getElementById("snap-buy").textContent  = buy.length;
    document.getElementById("snap-hold").textContent = hold.length;
    document.getElementById("snap-sell").textContent = sell.length;
    document.getElementById("snap-table").innerHTML = buildTable(
      ["Ticker", "Company", "Sector", "Price", "Conf %", "RSI", "Stop ($)", "Target ($)", "R:R"],
      buy.slice(0, 5).map(r => [r.ticker, r.company, r.sector, fmt$(r.price), r.confidence.toFixed(1) + "%", r.rsi,
        r.stop ? fmt$(r.stop) : "—", r.target ? fmt$(r.target) : "—", r.rr || "—"])
    );
    document.getElementById("snap-caption").textContent = "Stop Loss = −5%  |  Target = +12%  |  R:R = 1:2.4";
    document.getElementById("signal-snapshot").style.display = "block";
  } catch (e) { console.error(e); }
  finally { btn.disabled = false; btn.textContent = "Load Signals"; }
}

// ───────────────────────────────────────────────────────────────────
//  STOCK CHART
// ───────────────────────────────────────────────────────────────────
async function loadStockChart(ticker) {
  if (!ticker) return;
  const chartEl = document.getElementById("stock-chart");
  chartEl.innerHTML = `<div class="loading-msg">${spinner(`Loading ${ticker}…`)}</div>`;
  try {
    // Reuse watchlist cache if available (avoids double-fetch)
    let d = _stockDataCache[ticker] ? _stockDataCache[ticker] : await fetchYFChart(ticker, "6mo");
    const cls  = d.close.filter(v => v != null && isFinite(v));
    const dates = d.dates.slice(-cls.length);
    const sma20 = cls.map((_, i) => calcSMA(cls.slice(0, i + 1), Math.min(20, i + 1)));
    const std20 = cls.map((_, i) => {
      const sl = cls.slice(Math.max(0, i - 19), i + 1);
      const m  = sl.reduce((a, b) => a + b, 0) / sl.length;
      return Math.sqrt(sl.reduce((s, v) => s + (v - m) ** 2, 0) / sl.length);
    });
    const bbU  = sma20.map((m, i) => m + 2 * std20[i]);
    const bbL  = sma20.map((m, i) => m - 2 * std20[i]);
    const ema9  = cls.map((_, i) => calcEMA(cls.slice(0, i + 1), Math.min(9,  i + 1)));
    const ema21 = cls.map((_, i) => calcEMA(cls.slice(0, i + 1), Math.min(21, i + 1)));

    const info = WATCHLIST[ticker] ?? { name: ticker };
    const shapes = [], annotations = [];
    if (_signals) {
      const sig = _signals.find(r => r.ticker === ticker);
      if (sig?.signal === "BUY" && sig.stop) {
        shapes.push(
          { type: "line", x0: dates[0], x1: dates[dates.length-1], y0: sig.stop,   y1: sig.stop,   line: { color: "#ff4d6d", width: 1.5, dash: "dash" } },
          { type: "line", x0: dates[0], x1: dates[dates.length-1], y0: sig.target, y1: sig.target, line: { color: "#dc143c", width: 1.5, dash: "dash" } }
        );
        annotations.push(
          { x: dates[dates.length-1], y: sig.stop,   text: `Stop ${fmt$(sig.stop)}`,     showarrow: false, xanchor: "right", font: { color: "#ff4d6d" } },
          { x: dates[dates.length-1], y: sig.target, text: `Target ${fmt$(sig.target)}`, showarrow: false, xanchor: "right", font: { color: "#dc143c" } }
        );
        const bar = document.getElementById("stock-signal-bar");
        bar.style.display = "flex";
        bar.innerHTML = `<span>Signal <strong style="color:#dc143c">BUY</strong></span>
          <span>Conf <strong>${sig.confidence.toFixed(1)}%</strong></span>
          <span>RSI <strong>${sig.rsi}</strong></span>
          <span>Price <strong>${fmt$(sig.price)}</strong></span>
          <span>Stop <strong style="color:#ff4d6d">${fmt$(sig.stop)}</strong></span>
          <span>Target <strong style="color:#dc143c">${fmt$(sig.target)}</strong></span>`;
      } else {
        document.getElementById("stock-signal-bar").style.display = "none";
      }
    }

    Plotly.newPlot("stock-chart", [
      { x: dates, y: bbU,  line: { width: 0 }, showlegend: false, name: "BB Upper", type: "scatter" },
      { x: dates, y: bbL,  fill: "tonexty", fillcolor: "rgba(220,20,60,0.06)", line: { width: 0 }, name: "Bollinger Bands", type: "scatter" },
      { x: dates, y: cls,  name: "Price",  line: { color: "#dc143c", width: 2.5 }, type: "scatter" },
      { x: dates, y: ema9,  name: "EMA 9",  line: { color: "#ff4d6d", width: 1.5, dash: "dot" }, type: "scatter" },
      { x: dates, y: ema21, name: "EMA 21", line: { color: "#ff6b35", width: 1.5, dash: "dot" }, type: "scatter" },
    ], {
      ...PLOT_LAYOUT, height: 380,
      title: { text: `${ticker} — ${info.name}`, font: { size: 14 } },
      yaxis: { title: "Price ($)" }, shapes, annotations,
    }, PLOT_CONFIG);
  } catch (e) {
    document.getElementById("stock-chart").textContent = `Failed to load ${ticker}: ${e.message}`;
  }
}

// ───────────────────────────────────────────────────────────────────
//  RL ADVISOR  (runs entirely in-browser via ONNX Runtime Web)
// ───────────────────────────────────────────────────────────────────
function renderRlRegimeState(regime, price, ema50, gap) {
  const bear   = document.getElementById("rl-bear-banner");
  const active = document.getElementById("rl-active-banner");
  if (regime === "BEAR") {
    bear.style.display = "block";
    bear.className = "regime-banner bear";
    bear.innerHTML = `<div style="color:#ff4d6d;font-weight:700;margin-bottom:8px">● Bear Market — No New Positions</div>
      <p>SPY (${fmt$(price)}) is <strong>${Math.abs(gap).toFixed(1)}% below</strong> its 50d EMA (${fmt$(ema50)}).
      The RL agent holds cash in bear markets.</p>
      <p style="color:#ff4d6d;margin-top:6px"><strong>Check back when SPY reclaims ${fmt$(ema50)}.</strong></p>`;
    active.style.display = "none";
  } else {
    bear.style.display = "none";
    active.style.display = "block";
  }
}

let _rlAdvisorRunning = false;
async function loadRlAdvisor() {
  if (_rlAdvisorRunning) return;
  _rlAdvisorRunning = true;
  const cash    = parseFloat(document.getElementById("cash-input").value) || 10000;
  const loading = document.getElementById("rl-loading-banner");
  loading.style.display = "block";
  document.getElementById("rl-results").style.display = "none";

  try {
    // Step 1: load the ONNX model (cached after first load)
    loading.innerHTML = spinner("Loading RL model (cached after first run)…");
    const { session, meta, error } = await loadRLModel();
    if (!session) throw new Error(error || "model.onnx not found — run scripts/export_onnx.py first");

    // Step 2: ensure we have stock data (reuse watchlist cache)
    if (!_signalsLoaded) {
      loading.innerHTML = spinner("Fetching stock data for all stocks…");
      await loadWatchlist();
    }

    // Step 3: get macro data for portfolio features
    loading.innerHTML = spinner("Running RL inference in browser…");
    const vix     = _macroCache.vix     ?? 20;
    const yield10 = _macroCache.yield10 ?? 4.0;
    const dxy     = _macroCache.dxy     ?? 103;
    const spyVal  = _spyData ? (_spyData.gap > 2 ? 1 : _spyData.gap < -2 ? 0 : 0.5) : 0.5;

    // Step 4: run the model
    const recs = await runRLModel(_stockDataCache, meta.tickers, spyVal, 1.0, vix, yield10, dxy);

    if (!recs.length) {
      document.getElementById("rl-results").style.display = "block";
      document.getElementById("rl-table").innerHTML = `<div class="info-banner">The RL agent sees no strong BUY opportunities right now. Hold cash.</div>`;
      return;
    }

    // Step 5: equal-weight allocation (Kelly needs Python; equal-weight is sound)
    const perStock = cash * 0.95 / recs.length;  // keep 5% cash reserve
    const allocated = recs.map(r => ({
      ...r,
      shares:     Math.floor(perStock / r.price),
      cost:       Math.floor(perStock / r.price) * r.price,
      weight_pct: Math.round(perStock / cash * 100 * 10) / 10,
    }));
    const totalCost    = allocated.reduce((s, r) => s + r.cost, 0);
    const remaining    = cash - totalCost;
    const sectors      = new Set(allocated.map(r => r.sector)).size;
    const maxGain      = totalCost * 0.12;
    const maxLoss      = totalCost * 0.05;

    document.getElementById("rl-method-note").textContent = "Equal-weight allocation (5% cash reserve)";
    document.getElementById("rl-summary-metrics").innerHTML = [
      { label: "Positions",         val: allocated.length },
      { label: "Sectors",           val: sectors },
      { label: "Deployed",          val: ((totalCost / cash) * 100).toFixed(1) + "%" },
      { label: "Max Upside (12%)",  val: "+$" + maxGain.toFixed(2) },
      { label: "Max Downside (5%)", val: "−$" + maxLoss.toFixed(2) },
    ].map(m => `<div class="metric-card"><div class="metric-label">${m.label}</div><div class="metric-value">${m.val}</div></div>`).join("");

    document.getElementById("rl-table").innerHTML = buildTable(
      ["Ticker", "Company", "Sector", "Price", "Shares", "Alloc", "Cost", "Conf %", "Stop", "Target", "R:R", ""],
      allocated.map(r => [
        r.ticker, r.name, r.sector, fmt$(r.price), r.shares,
        r.weight_pct + "%", fmt$(r.cost), r.confidence + "%",
        fmt$(r.stop), fmt$(r.target), r.rr, r.monitor ? "⚠️" : "",
      ])
    );

    // Build gradient color array for pie slices
    const pieColors = allocated.map((_, i) => {
      const t = i / Math.max(allocated.length - 1, 1);
      const r = Math.round(220 + (255 - 220) * t);
      const g = Math.round(20 + (77 - 20) * t);
      const b = Math.round(60 + (109 - 60) * t);
      return `rgb(${r},${g},${b})`;
    });
    const pieLabels = [...allocated.map(r => r.ticker), "Cash"];
    const pieValues = [...allocated.map(r => r.cost), remaining];
    Plotly.newPlot("rl-pie-chart", [{
      type: "pie", labels: pieLabels, values: pieValues, hole: 0.5,
      marker: { colors: [...pieColors, "rgba(255,255,255,0.08)"] },
      textinfo: "label+percent",
      textfont: { size: 10 },
      showlegend: false,
    }], {
      ...PLOT_LAYOUT, height: 340,
      margin: { l: 10, r: 10, t: 10, b: 10 },
      annotations: [{ text: fmt$(cash), x: 0.5, y: 0.5, font: { size: 14, color: "#f0e8ec" }, showarrow: false }],
    }, PLOT_CONFIG);

    // Bar chart — force categorical x-axis to prevent date auto-detection
    const barTickers = allocated.map(r => String(r.ticker));
    const barColors  = allocated.map((_, i) => {
      const t = i / Math.max(allocated.length - 1, 1);
      return `hsl(${350 - t * 30}, ${80 - t * 20}%, ${45 + t * 15}%)`;
    });
    Plotly.newPlot("rl-bar-chart", [{
      type: "bar", name: "Alloc %",
      x: barTickers,
      y: allocated.map(r => r.weight_pct),
      marker: { color: barColors },
      text: allocated.map(r => r.weight_pct.toFixed(1) + "%"),
      textposition: "outside",
      textfont: { size: 10, color: "#f0e8ec" },
    }], {
      ...PLOT_LAYOUT, height: 340,
      xaxis: { type: "category", tickangle: -35, tickfont: { size: 10 } },
      yaxis: { title: "% of portfolio", gridcolor: "rgba(220,20,60,0.1)" },
      margin: { l: 50, r: 20, t: 20, b: 80 },
    }, PLOT_CONFIG);

    document.getElementById("rl-kelly-info").innerHTML =
      `Model runs entirely in your browser via <strong>ONNX Runtime WebAssembly</strong> — no server needed.<br><br>
       Allocation is equal-weight with a 5% cash reserve. Stop loss: −5%, Target: +12%, R:R = 1:2.4.`;

    document.getElementById("rl-results").style.display = "block";
  } catch (e) {
    document.getElementById("rl-results").style.display = "block";
    document.getElementById("rl-table").innerHTML = `<div class="warn-banner">${e.message}</div>`;
    console.error(e);
  } finally {
    loading.style.display = "none";
    _rlAdvisorRunning = false;
  }
}

// ───────────────────────────────────────────────────────────────────
//  BACKTEST  (loads saved JSON from GitHub Pages)
// ───────────────────────────────────────────────────────────────────
async function loadBacktest() {
  _backtestLoaded = true;
  document.getElementById("backtest-loading").style.display = "block";
  document.getElementById("backtest-content").style.display = "none";
  document.getElementById("backtest-none").style.display    = "none";

  try {
    // Try fetching pre-exported JSON from GitHub Pages
    const res = await fetch("data/backtest_results.json");
    if (!res.ok) throw new Error("not found");
    const d = await res.json();
    renderBacktest(d);
  } catch (_) {
    // Fallback: try the RL API
    try {
      const res = await fetch(`${RL_API_BASE}/api/backtest`);
      const d   = await res.json();
      if (!d.available) throw new Error("no data");
      renderBacktest(d);
    } catch (__) {
      document.getElementById("backtest-loading").style.display = "none";
      document.getElementById("backtest-none").style.display    = "block";
    }
  }
}

function renderBacktest(d) {
  const { rl, rb } = d;
  document.getElementById("backtest-loading").style.display = "none";

  const metrics = [
    ["Total Return (%)", `${rl.total_return_pct > 0 ? "+" : ""}${rl.total_return_pct.toFixed(2)}%`, `${rb.total_return_pct > 0 ? "+" : ""}${rb.total_return_pct.toFixed(2)}%`],
    ["CAGR (%)",         `${rl.cagr > 0 ? "+" : ""}${rl.cagr.toFixed(2)}%`,     `${rb.cagr > 0 ? "+" : ""}${rb.cagr.toFixed(2)}%`],
    ["Sharpe Ratio",     rl.sharpe.toFixed(4),  rb.sharpe.toFixed(4)],
    ["Sortino Ratio",    rl.sortino.toFixed(4), rb.sortino.toFixed(4)],
    ["Max Drawdown (%)", rl.max_drawdown.toFixed(2) + "%", rb.max_drawdown.toFixed(2) + "%"],
    ["Calmar Ratio",     rl.calmar.toFixed(4),  rb.calmar.toFixed(4)],
    ["Ann. Volatility",  rl.ann_volatility.toFixed(2) + "%", rb.ann_volatility.toFixed(2) + "%"],
    ["Total Trades",     String(rl.n_trades),   String(rb.n_trades)],
  ];
  document.getElementById("backtest-metrics-table").innerHTML = buildTable(["Metric", "RL Agent (PPO)", "Rule-Based Bot"], metrics);

  Plotly.newPlot("backtest-value-chart", [
    { x: rl.dates, y: rl.portfolio_vals, name: `RL Agent (+${rl.total_return_pct.toFixed(1)}%)`, line: { color: "#dc143c", width: 2.5 }, type: "scatter" },
    { x: rb.dates, y: rb.portfolio_vals, name: `Rule-Based (+${rb.total_return_pct.toFixed(1)}%)`, line: { color: "#ff4d6d", width: 2.5 }, type: "scatter" },
  ], { ...PLOT_LAYOUT, height: 380, yaxis: { title: "Portfolio Value ($)" },
    shapes: [{ type: "line", x0: rl.dates[0], x1: rl.dates[rl.dates.length-1], y0: 10000, y1: 10000, line: { color: "rgba(255,255,255,0.2)", dash: "dash" } }]
  }, PLOT_CONFIG);

  const ddRl = rl.drawdown_series.map(v => -(v * 100));
  const ddRb = rb.drawdown_series.map(v => -(v * 100));
  Plotly.newPlot("backtest-dd-chart", [
    { x: rl.dates.slice(0, ddRl.length), y: ddRl, fill: "tozeroy", fillcolor: "rgba(220,20,60,0.12)",  name: "RL Agent",   line: { color: "#dc143c", width: 1.5 }, type: "scatter" },
    { x: rb.dates.slice(0, ddRb.length), y: ddRb, fill: "tozeroy", fillcolor: "rgba(255,77,109,0.12)", name: "Rule-Based", line: { color: "#ff4d6d", width: 1.5 }, type: "scatter" },
  ], { ...PLOT_LAYOUT, height: 280, yaxis: { title: "Drawdown (%)" } }, PLOT_CONFIG);

  const dailyRl = rl.portfolio_vals.slice(1).map((v, i) => (v - rl.portfolio_vals[i]) / Math.max(rl.portfolio_vals[i], 1) * 100);
  const dailyRb = rb.portfolio_vals.slice(1).map((v, i) => (v - rb.portfolio_vals[i]) / Math.max(rb.portfolio_vals[i], 1) * 100);
  Plotly.newPlot("backtest-hist-chart", [
    { x: dailyRl, type: "histogram", nbinsx: 60, name: "RL Agent",   marker: { color: "#dc143c" }, opacity: 0.65 },
    { x: dailyRb, type: "histogram", nbinsx: 60, name: "Rule-Based", marker: { color: "#ff4d6d" }, opacity: 0.65 },
  ], { ...PLOT_LAYOUT, height: 280, barmode: "overlay", xaxis: { title: "Daily Return (%)" }, yaxis: { title: "Frequency" } }, PLOT_CONFIG);

  document.getElementById("backtest-caption").textContent =
    `Test period: ${rl.dates[0]} → ${rl.dates[rl.dates.length - 1]}  |  Starting capital: $10,000`;
  document.getElementById("backtest-content").style.display = "block";
}

// ───────────────────────────────────────────────────────────────────
//  NEWS & MACRO  (Yahoo Finance RSS + direct price fetch)
// ───────────────────────────────────────────────────────────────────
async function loadNews(forceRefresh = false) {
  _newsLoaded = true;
  document.getElementById("news-loading").style.display = "block";
  document.getElementById("news-content").style.display = "none";

  try {
    // Macro indicators — individual chart fetches (v8/chart works reliably)
    const macroTickers = Object.keys(MACRO_TICKERS);
    const quoteMap = new Map();
    await Promise.all(macroTickers.map(async sym => {
      try {
        const d = await fetchYFChart(sym, "5d");
        const closes = d.close.filter(v => v != null && isFinite(v));
        if (closes.length >= 2) {
          const price = closes[closes.length - 1];
          const prev  = closes[closes.length - 2];
          quoteMap.set(sym, { price, chgPct: (price - prev) / prev * 100 });
        }
      } catch (_) {}
    }));

    const macroGrid = document.getElementById("macro-cards");
    macroGrid.innerHTML = macroTickers.map(sym => {
      const meta = MACRO_TICKERS[sym];
      const q    = quoteMap.get(sym);
      if (!q) return `<div class="macro-card"><div class="macro-card-name">${meta.name}</div><div class="macro-card-value" style="color:#555">N/A</div></div>`;
      const chg = q.chgPct;
      let col   = "#aaaaaa";
      if (Math.abs(chg) >= 0.3) col = (meta.good_low ? chg < 0 : chg > 0) ? "#dc143c" : "#ff4d6d";
      const val = meta.unit === "$" ? fmt$(q.price) : `${q.price.toFixed(2)}${meta.unit}`;
      return `<div class="macro-card" style="border-color:${col}44">
        <div class="macro-card-name">${meta.name}</div>
        <div class="macro-card-value" style="color:${col}">${val}</div>
        <div class="macro-card-chg"  style="color:${col}">${chg > 0 ? "+" : ""}${chg.toFixed(2)}% today</div>
      </div>`;
    }).join("");

    // Risk banner
    const vixQ  = quoteMap.get("^VIX");
    const tnxQ  = quoteMap.get("^TNX");
    const vix   = vixQ?.price ?? 0;
    const yield_ = tnxQ?.price ?? 0;
    const risks = [];
    if (vix > 30)    risks.push(`⚠️ VIX ${vix.toFixed(1)} — elevated fear (>30)`);
    if (vix > 20)    risks.push(`VIX ${vix.toFixed(1)} — market uncertainty`);
    if (yield_ > 4.5) risks.push(`10Y yield ${yield_.toFixed(2)}% — high rate pressure`);
    const riskLevel = vix > 30 ? "HIGH" : vix > 20 ? "MODERATE" : "LOW";
    const riskColor = vix > 30 ? "#ff4d6d" : vix > 20 ? "#ff6b35" : "#dc143c";
    const riskBanner = document.getElementById("macro-risk-banner");
    riskBanner.style.cssText = `background:${riskColor}22; border:1px solid ${riskColor}; border-radius:10px; padding:12px 16px; margin-bottom:16px`;
    riskBanner.innerHTML = `<b style="color:${riskColor};font-size:1.05rem">Macro Risk: ${riskLevel}</b>
      <ul style="margin:6px 0 0 16px; font-size:0.85rem">${risks.length ? risks.map(r => `<li>${r}</li>`).join("") : "<li>No major macro warnings</li>"}</ul>`;

    // Sector sentiment — always include major names + rest of watchlist
    const FEATURED = ["NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "AMD", "NFLX", "ADBE"];
    const rest     = Object.keys(WATCHLIST).filter(t => !FEATURED.includes(t)).slice(0, 10);
    const newsItems = await fetchYahooNews([...FEATURED, ...rest, "SPY", "QQQ"]);
    renderSentimentChart(newsItems);
    document.querySelectorAll(".sent-filter").forEach(cb => cb.onchange = () => renderNewsFeed(newsItems));
    renderNewsFeed(newsItems);

    document.getElementById("news-loading").style.display = "none";
    document.getElementById("news-content").style.display = "block";
  } catch (e) {
    document.getElementById("news-loading").textContent = `Failed to load news: ${e.message}`;
    console.error(e);
  }
}

async function fetchYahooNews(tickers) {
  const items = [];
  // Use Yahoo Finance v1 search JSON API (returns news in JSON, more reliable than RSS)
  const queries = [
    { q: "stock market",    label: "Broad Market" },
    { q: "S&P 500",         label: "Broad Market" },
    { q: "tech stocks",     label: "Technology" },
    { q: "halal investing", label: "Halal / Islamic Finance" },
    { q: "fed rates",       label: "Macro / Fed Policy" },
  ];
  const tickerBatch = tickers.slice(0, 20);

  function makeTimestamp(t) {
    if (!t) return "";
    const d = new Date(t * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
           d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  await Promise.all([
    // Ticker-based news — tag with sector from WATCHLIST
    ...tickerBatch.map(async ticker => {
      try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}&newsCount=5&quotesCount=0`;
        const res  = await corsGet(url);
        const json = await res.json();
        const category = WATCHLIST[ticker]?.sector ?? ticker;
        (json?.news ?? []).forEach(n => {
          if (!n.title) return;
          items.push({
            title:     n.title,
            link:      n.link ?? "",
            sentiment: scoreSentiment(n.title + " " + (n.summary ?? "")),
            publisher: n.publisher ?? "Yahoo Finance",
            time:      makeTimestamp(n.providerPublishTime),
            category,
          });
        });
      } catch (_) {}
    }),
    // General market news — tag with query label
    ...queries.map(async ({ q, label }) => {
      try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=6&quotesCount=0`;
        const res  = await corsGet(url);
        const json = await res.json();
        (json?.news ?? []).forEach(n => {
          if (!n.title) return;
          items.push({
            title:     n.title,
            link:      n.link ?? "",
            sentiment: scoreSentiment(n.title + " " + (n.summary ?? "")),
            publisher: n.publisher ?? "Yahoo Finance",
            time:      makeTimestamp(n.providerPublishTime),
            category:  label,
          });
        });
      } catch (_) {}
    }),
  ]);

  // Deduplicate by title
  const seen = new Set();
  return items.filter(item => {
    if (!item.title || seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  }).sort((a, b) => (b.time > a.time ? 1 : -1)).slice(0, 80);
}

function renderSentimentChart(items) {
  // Aggregate net sentiment score per category
  const scores = {};
  const counts = {};
  items.forEach(item => {
    const cat = item.category ?? "General";
    if (!(cat in scores)) { scores[cat] = 0; counts[cat] = 0; }
    scores[cat] += item.sentiment.includes("BULLISH") ? 1 : item.sentiment.includes("BEARISH") ? -1 : 0;
    counts[cat]++;
  });
  if (Object.keys(scores).length === 0) {
    document.getElementById("sentiment-chart").innerHTML = `<div class="info-banner">No sector sentiment data yet.</div>`;
    return;
  }

  // Sort by score descending
  const sects = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const labels = sects.map(([k]) => k);
  const vals   = sects.map(([, v]) => v);
  const colors = vals.map(v => v > 1 ? "#dc143c" : v > 0 ? "#ff4d6d" : v < -1 ? "#cc0022" : v < 0 ? "#ff6b35" : "#8a7f82");
  const hover  = sects.map(([k, v]) => `${k}<br>Net score: ${v > 0 ? "+" : ""}${v} (${counts[k]} articles)`);

  const chartHeight = Math.max(260, sects.length * 34 + 60);
  Plotly.newPlot("sentiment-chart", [{
    type: "bar", orientation: "h",
    x: vals, y: labels,
    marker: { color: colors },
    text: vals.map(v => v > 0 ? `+${v}` : `${v}`),
    textposition: "outside",
    hovertext: hover,
    hoverinfo: "text",
  }], {
    ...PLOT_LAYOUT,
    height: chartHeight,
    margin: { l: 180, r: 50, t: 20, b: 40 },
    xaxis: {
      title: "Net Sentiment Score",
      zeroline: true, zerolinecolor: "rgba(255,255,255,0.25)",
      gridcolor: "rgba(255,255,255,0.05)",
    },
    yaxis: { automargin: true },
  }, PLOT_CONFIG);
}

function renderNewsFeed(items) {
  const selected = [...document.querySelectorAll(".sent-filter:checked")].map(c => c.value);
  const filtered = items.filter(i => selected.includes(i.sentiment));
  const feed     = document.getElementById("news-feed");
  if (!filtered.length) { feed.innerHTML = `<div class="info-banner">No headlines match the filter.</div>`; return; }
  feed.innerHTML = filtered.map(item => {
    const sc = SENT_COLORS[item.sentiment] ?? { fg: "#aaa", bg: "#222" };
    const titleHtml = item.link ? `<a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>` : item.title;
    return `<div class="news-item" style="border-left-color:${sc.fg}">
      <div class="news-item-header">
        <span class="news-badge" style="color:${sc.fg};background:${sc.bg};border-color:${sc.fg}">${item.sentiment}</span>
        <span class="news-meta">${item.time} · ${item.publisher}</span>
      </div>
      <div class="news-title">${titleHtml}</div>
    </div>`;
  }).join("");
}

// ───────────────────────────────────────────────────────────────────
//  REFRESH
// ───────────────────────────────────────────────────────────────────
function refreshAll() {
  _signals = null; _signalsLoaded = false;
  _spyData = null; _newsLoaded = false; _backtestLoaded = false;
  _rlAdvisorRunning = false;
  loadStatus();
  const tab = document.querySelector(".tab-btn.active")?.dataset?.tab;
  if (tab === "watchlist")   loadWatchlist();
  if (tab === "predictions") loadNews(true);
  if (tab === "backtest")    loadBacktest();
  if (tab === "rl-advisor" || tab === "dashboard") {
    loadSpyData().then(() => { if (tab === "rl-advisor") loadRlAdvisor(); });
  }
}

// ───────────────────────────────────────────────────────────────────
//  BOOT
// ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initDisclaimers();
  loadStatus();
  checkModelStatus();

  // Populate stock dropdown immediately
  const stockSel = document.getElementById("stock-select");
  stockSel.innerHTML = Object.keys(WATCHLIST).sort().map(t => `<option value="${t}">${t}</option>`).join("");

  document.getElementById("cash-input").addEventListener("change", () => {
    renderQuickBuyPlanner();
    const tab = document.querySelector(".tab-btn.active")?.dataset?.tab;
    if (tab === "rl-advisor" && _spyData) {
      _rlAdvisorRunning = false;
      loadRlAdvisor();
    }
  });
});

async function checkModelStatus() {
  const el = document.getElementById("model-status");
  try {
    const res = await fetch("model_meta.json");
    if (!res.ok) throw new Error("not found");
    const meta = await res.json();
    el.className = "model-status model-ok";
    el.textContent = `✓ RL model ready · ${meta.n_stocks} stocks`;
  } catch (_) {
    el.className = "model-status model-err";
    el.textContent = "⚠ model.onnx not found — RL Advisor unavailable";
  }
}
