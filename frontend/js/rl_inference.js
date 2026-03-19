/* ─────────────────────────────────────────────────────────────────
   RL Inference — runs the PPO model in the browser via ONNX Runtime Web
   No Python server needed.
───────────────────────────────────────────────────────────────── */

let _ortSession  = null;
let _modelMeta   = null;
let _modelLoaded = false;
let _modelError  = null;

// ── Load ONNX model + metadata ──────────────────────────────────────
async function loadRLModel() {
  if (_modelLoaded) return { session: _ortSession, meta: _modelMeta, error: _modelError };
  try {
    // Load metadata first (tiny JSON)
    const metaRes = await fetch("model_meta.json");
    if (!metaRes.ok) throw new Error("model_meta.json not found — run scripts/export_onnx.py first");
    _modelMeta = await metaRes.json();

    // Load ONNX model (~8–14MB, cached by browser after first load)
    _ortSession = await ort.InferenceSession.create("model.onnx", {
      executionProviders: ["wasm"],
    });
    _modelLoaded = true;
    console.log("✓ ONNX model loaded:", _modelMeta.n_stocks, "stocks, obs_size:", _modelMeta.obs_size);
    return { session: _ortSession, meta: _modelMeta, error: null };
  } catch (e) {
    _modelError  = e.message;
    _modelLoaded = true;  // don't retry
    return { session: null, meta: null, error: e.message };
  }
}

// ── Build observation vector ────────────────────────────────────────
// Mirrors feature_engineering.py  build_feature_arrays() + portfolio features
function buildObservation(stockData, tickers, spyRegimeVal, cashRatio = 1.0, vix = 20, yield10y = 4.0, dxy = 103) {
  const N_STOCK_FEATS     = 12;
  const N_PORTFOLIO_FEATS = 7;
  const nStocks           = tickers.length;
  const obsSize           = nStocks * N_STOCK_FEATS + N_PORTFOLIO_FEATS;
  const obs               = new Float32Array(obsSize);

  // Helper: safe normalize
  const clip = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const nan2zero = v => (isFinite(v) ? v : 0);

  // ── Per-stock features (12 each) ──────────────────────────────────
  // Feature order must match STOCK_FEATURE_NAMES in feature_engineering.py:
  // 0  price_vs_sma200   1  rsi14_norm       2  macd_hist_norm
  // 3  ema_ratio         4  bb_pos           5  atr_norm
  // 6  vol_anomaly       7  mom_5d           8  mom_20d
  // 9  rsi_divergence    10 vol_confirm      11 rel_strength (filled after loop)

  const mom20s = [];  // collect for rel_strength computation

  tickers.forEach((ticker, si) => {
    const d   = stockData[ticker];
    const base = si * N_STOCK_FEATS;

    if (!d || d.close.length < 30) {
      // Leave zeros if we have no data for this ticker
      mom20s.push(0);
      return;
    }

    const cls = d.close;
    const vol = d.volume;
    const n   = cls.length;

    // 0. price vs SMA200
    const sma200 = calcSMA(cls, Math.min(200, n));
    obs[base + 0] = nan2zero(clip((cls[n-1] - sma200) / (sma200 || 1), -2, 2));

    // 1. RSI14 normalised to [-1, +1]
    const rsi = calcRSI(cls);
    obs[base + 1] = nan2zero(clip((rsi - 50) / 50, -1, 1));

    // 2. MACD histogram normalised by ATR
    const { histogram } = calcMACD(cls);
    const atr = calcATR(d);
    obs[base + 2] = nan2zero(clip(histogram / (atr || 1), -3, 3));

    // 3. EMA9/EMA21 ratio
    const ema9  = calcEMA(cls, Math.min(9,  n));
    const ema21 = calcEMA(cls, Math.min(21, n));
    obs[base + 3] = nan2zero(clip(ema9 && ema21 ? ema9 / ema21 - 1 : 0, -0.1, 0.1));

    // 4. Bollinger Band position [0, 1]
    const bb = calcBollingerBands(cls);
    if (bb && bb.upper > bb.lower) {
      obs[base + 4] = nan2zero(clip((cls[n-1] - bb.lower) / (bb.upper - bb.lower), 0, 1));
    }

    // 5. ATR/price (normalised volatility)
    obs[base + 5] = nan2zero(clip(atr / (cls[n-1] || 1), 0, 0.1));

    // 6. Volume anomaly: log(vol / 20d avg vol)
    const avgVol = vol && vol.length >= 20
      ? vol.slice(-20).filter(v => v > 0).reduce((a, b) => a + b, 0) / 20 : 1;
    const lastVol = vol && vol.length ? vol[vol.length - 1] : 0;
    obs[base + 6] = nan2zero(clip(Math.log1p(Math.max(lastVol / (avgVol || 1) - 1, -1)), -3, 3));

    // 7. mom_5d
    const mom5 = n >= 6 ? (cls[n-1] - cls[n-6]) / (cls[n-6] || 1) : 0;
    obs[base + 7] = nan2zero(clip(mom5, -0.5, 0.5));

    // 8. mom_20d
    const mom20 = n >= 21 ? (cls[n-1] - cls[n-21]) / (cls[n-21] || 1) : 0;
    obs[base + 8] = nan2zero(clip(mom20, -0.5, 0.5));
    mom20s.push(mom20);

    // 9. RSI divergence: price new high but RSI not (+1), or price new low but RSI not (-1)
    if (n >= 10) {
      const recentHigh = Math.max(...cls.slice(-10));
      const recentLow  = Math.min(...cls.slice(-10));
      const rsiSeries  = cls.slice(-10).map((_, i) => calcRSI(cls.slice(0, n - 9 + i)));
      const rsiMax = Math.max(...rsiSeries);
      const rsiMin = Math.min(...rsiSeries);
      let div = 0;
      if (cls[n-1] >= recentHigh && rsi < rsiMax - 3) div = -1;  // bearish divergence
      if (cls[n-1] <= recentLow  && rsi > rsiMin + 3) div =  1;  // bullish divergence
      obs[base + 9] = div;
    }

    // 10. vol_confirm: sign(price change) * log(vol ratio)
    if (n >= 2 && avgVol > 0) {
      const priceSign = Math.sign(cls[n-1] - cls[n-2]);
      const logRatio  = Math.log1p(Math.max(Math.min(lastVol / avgVol, 10) - 1, -1));
      obs[base + 10]  = nan2zero(clip(priceSign * logRatio, -3, 3));
    }

    // 11. rel_strength — filled after the loop
    obs[base + 11] = 0;
  });

  // Relative strength: (mom20 - median_mom20) clipped to [-2, 2]
  const sorted    = [...mom20s].sort((a, b) => a - b);
  const medianMom = sorted[Math.floor(sorted.length / 2)] || 0;
  tickers.forEach((_, si) => {
    obs[si * N_STOCK_FEATS + 11] = clip(mom20s[si] - medianMom, -2, 2);
  });

  // ── Portfolio features (7) ────────────────────────────────────────
  const pBase = nStocks * N_STOCK_FEATS;
  obs[pBase + 0] = cashRatio;                         // cash ratio
  obs[pBase + 1] = 0;                                 // n_positions / max (0 at start)
  obs[pBase + 2] = spyRegimeVal;                      // SPY regime [0,1]
  obs[pBase + 3] = 0.5;                               // episode progress (mid-point)
  obs[pBase + 4] = clip((vix - 20) / 30, -1, 1);     // VIX normalised
  obs[pBase + 5] = clip((yield10y - 3) / 5, -1, 1);  // 10Y yield normalised
  obs[pBase + 6] = clip((dxy - 100) / 20, -1, 1);    // DXY normalised

  return obs;
}

// ── ATR helper ──────────────────────────────────────────────────────
function calcATR(d, period = 14) {
  if (!d || !d.high || !d.low || !d.close || d.close.length < period + 1) return 0;
  const { high, low, close } = d;
  const n  = close.length;
  const trs = [];
  for (let i = Math.max(1, n - period - 5); i < n; i++) {
    const tr = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i-1]),
      Math.abs(low[i]  - close[i-1])
    );
    trs.push(tr);
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, trs.length);
}

// ── Run inference ───────────────────────────────────────────────────
async function runRLModel(stockData, tickers, spyRegimeVal, cashRatio, vix, yield10y, dxy) {
  const { session, meta, error } = await loadRLModel();
  if (!session) throw new Error(error || "Model not loaded");

  const obsArr = buildObservation(stockData, tickers, spyRegimeVal, cashRatio, vix, yield10y, dxy);

  // Pad or trim to expected obs_size (in case of ticker count mismatch)
  const padded = new Float32Array(meta.obs_size);
  padded.set(obsArr.slice(0, meta.obs_size));

  const inputTensor = new ort.Tensor("float32", padded, [1, meta.obs_size]);
  const results     = await session.run({ observation: inputTensor });
  const logits      = results.action_logits.data;  // Float32Array [n_stocks * 3]

  // Softmax per stock → pick argmax → map to action label
  const recommendations = [];
  for (let si = 0; si < meta.n_stocks; si++) {
    const ticker = meta.tickers[si];
    const base   = si * 3;
    const raw    = [logits[base], logits[base+1], logits[base+2]];

    // Softmax
    const maxL   = Math.max(...raw);
    const exps   = raw.map(v => Math.exp(v - maxL));
    const sumExp = exps.reduce((a, b) => a + b, 0);
    const probs  = exps.map(v => v / sumExp);

    // Action: 0=SELL, 1=BUY, 2=HOLD
    const action     = probs.indexOf(Math.max(...probs));
    const buyProb    = probs[1];
    const confidence = Math.round(buyProb * 100 * 10) / 10;

    if (action === 1 && buyProb > 0.4) {  // BUY with >40% probability
      const d     = stockData[ticker];
      const price = d?.close?.[d.close.length - 1] ?? 0;
      if (price <= 0) continue;

      const info = WATCHLIST[ticker] ?? { name: ticker, sector: "" };
      recommendations.push({
        ticker, price, confidence,
        name:    info.name,
        sector:  info.sector,
        monitor: MONITOR_LIST.has(ticker),
        stop:    Math.round(price * 0.95 * 100) / 100,
        target:  Math.round(price * 1.12 * 100) / 100,
        rr:      "1:2.4",
      });
    }
  }

  recommendations.sort((a, b) => b.confidence - a.confidence);
  return recommendations;
}
