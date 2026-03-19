/* ─────────────────────────────────────────────────────────────────
   Technical Indicators & Signal Generation — JS port of halal_trading_bot.py
───────────────────────────────────────────────────────────────── */

// ── EMA ────────────────────────────────────────────────────────────
function calcEMA(prices, period) {
  if (!prices || prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// Full EMA series (for MACD)
function calcEMASeries(prices, period) {
  if (!prices || prices.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(prices.length).fill(null);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

// ── RSI ────────────────────────────────────────────────────────────
function calcRSI(prices, period = 14) {
  if (!prices || prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ── MACD ───────────────────────────────────────────────────────────
function calcMACD(prices, fast = 12, slow = 26, signal = 9) {
  if (!prices || prices.length < slow + signal) return { macd: 0, signal: 0, histogram: 0 };
  const emaFastSeries = calcEMASeries(prices, fast);
  const emaSlowSeries = calcEMASeries(prices, slow);
  const macdSeries = [];
  for (let i = slow - 1; i < prices.length; i++) {
    if (emaFastSeries[i] !== null && emaSlowSeries[i] !== null) {
      macdSeries.push(emaFastSeries[i] - emaSlowSeries[i]);
    }
  }
  if (macdSeries.length < signal) return { macd: 0, signal: 0, histogram: 0 };
  const macdLine   = macdSeries[macdSeries.length - 1];
  const signalLine = calcEMA(macdSeries, signal);
  const hist       = signalLine !== null ? macdLine - signalLine : 0;
  return { macd: macdLine, signal: signalLine ?? 0, histogram: hist };
}

// ── Bollinger Bands ────────────────────────────────────────────────
function calcBollingerBands(prices, period = 20, numStd = 2) {
  if (!prices || prices.length < period) return null;
  const recent = prices.slice(-period);
  const sma    = recent.reduce((a, b) => a + b, 0) / period;
  const variance = recent.reduce((s, p) => s + (p - sma) ** 2, 0) / period;
  const std    = Math.sqrt(variance);
  return { upper: sma + numStd * std, mid: sma, lower: sma - numStd * std };
}

// ── SMA ────────────────────────────────────────────────────────────
function calcSMA(prices, period) {
  if (!prices || prices.length < period) return null;
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// ── Generate Signal ────────────────────────────────────────────────
// Exact port of generate_signal() in halal_trading_bot.py
function generateSignal(ticker, closePrices) {
  if (!closePrices || closePrices.length < 30) {
    return { signal: "HOLD", score: 0, confidence: 50, rsi: 50, price: closePrices?.slice(-1)[0] ?? 0 };
  }

  const price = closePrices[closePrices.length - 1];
  let score = 0;

  // 1. RSI
  const rsi = calcRSI(closePrices);
  if (rsi < 35)      score += 2;
  else if (rsi > 68) score -= 2;

  // 2. MACD
  const { macd, signal: sigLine, histogram } = calcMACD(closePrices);
  if (macd > sigLine && histogram > 0)      score += 2;
  else if (macd < sigLine && histogram < 0) score -= 2;

  // 3. EMA crossover
  const ema9  = calcEMA(closePrices, 9);
  const ema21 = calcEMA(closePrices, 21);
  if (ema9 !== null && ema21 !== null) {
    if (ema9 > ema21) score += 2;
    else              score -= 2;
  }

  // 4. Bollinger Bands
  const bb = calcBollingerBands(closePrices);
  if (bb) {
    const bbRange   = bb.upper - bb.lower;
    if (price <= bb.lower * 1.01)  score += 2;
    else if (price >= bb.upper * 0.99) score -= 2;
  }

  // 5. Price ROC 10-day
  if (closePrices.length >= 11) {
    const roc = (closePrices[closePrices.length - 1] - closePrices[closePrices.length - 11]) /
                 Math.max(closePrices[closePrices.length - 11], 1e-8) * 100;
    if (roc > 2)       score += 1;
    else if (roc < -2) score -= 1;
  }

  // 6. 60-day range position
  if (closePrices.length >= 20) {
    const period = closePrices.slice(-60);
    const lo = Math.min(...period);
    const hi = Math.max(...period);
    if (hi > lo) {
      const pctRank = (price - lo) / (hi - lo) * 100;
      if (pctRank < 20)      score += 1;
      else if (pctRank > 80) score -= 1;
    }
  }

  // 7. SMA50
  const sma50 = calcSMA(closePrices, 50);
  if (sma50 !== null) {
    if (price > sma50) score += 1;
    else               score -= 1;
  }

  // 8. RSI trend (5-day)
  if (closePrices.length >= 19) {
    const rsi5dAgo = calcRSI(closePrices.slice(0, -5));
    const delta    = rsi - rsi5dAgo;
    if (rsi < 50 && delta > 3)       score += 1;
    else if (rsi > 50 && delta < -3) score -= 1;
  }

  // Signal & confidence
  const maxScore = 12;
  let signalType, confidence;
  if (score >= 3) {
    signalType = "BUY";
    confidence = Math.min(score / maxScore * 100, 99);
  } else if (score <= -3) {
    signalType = "SELL";
    confidence = Math.min(Math.abs(score) / maxScore * 100, 99);
  } else {
    signalType = "HOLD";
    confidence = Math.max(10, 50 - Math.abs(score) * 5);
  }

  return {
    ticker, price, signal: signalType, score,
    confidence: Math.round(confidence * 10) / 10,
    rsi: Math.round(rsi * 10) / 10,
    stop:   signalType === "BUY" ? Math.round(price * 0.95 * 100) / 100 : null,
    target: signalType === "BUY" ? Math.round(price * 1.12 * 100) / 100 : null,
    rr:     signalType === "BUY" ? "1:2.4" : "",
    ema9, ema21,
    bbUpper: bb?.upper ?? null,
    bbLower: bb?.lower ?? null,
    sma20:   calcSMA(closePrices, 20),
    sma50,
  };
}

// ── News Sentiment (port of news_analyzer.py keyword logic) ────────
const BULLISH_WORDS = ["surge","rally","beat","record","growth","upgrade","strong","breakout",
  "outperform","expansion","recovery","partnership","launch","approval","profit","rise","gain",
  "boost","soar","jump","milestone","bullish","buy","positive","exceed","top","win","deal"];
const BEARISH_WORDS = ["crash","drop","miss","layoffs","recession","downgrade","concern","weak",
  "investigation","lawsuit","failure","warning","decline","loss","fall","plunge","risk","cut",
  "bearish","sell","negative","below","disappointing","fear","debt","default","fraud","fine"];

function scoreSentiment(text) {
  const lower = text.toLowerCase();
  const bull  = BULLISH_WORDS.filter(w => lower.includes(w)).length;
  const bear  = BEARISH_WORDS.filter(w => lower.includes(w)).length;
  const score = bull - bear;
  if (score >= 2)       return "BULLISH";
  if (score === 1)      return "SLIGHTLY BULLISH";
  if (score === 0)      return "NEUTRAL";
  if (score === -1)     return "SLIGHTLY BEARISH";
  return "BEARISH";
}
