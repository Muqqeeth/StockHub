const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/auth");
const { getAllPrices, getPrice, searchStocks } = require("../services/priceSimulator");

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// Helper: fetch candles from Finnhub
async function fetchCandles(symbol, resolution, from, to) {
  if (!FINNHUB_KEY || FINNHUB_KEY === "your_finnhub_api_key_here") return null;
  try {
    const res = await axios.get(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
    );
    if (res.data.s === "ok") return res.data;
  } catch (e) {}
  return null;
}

// Generate mock chart data as fallback
function generateMockChart(basePrice, days) {
  const data = [];
  let price = basePrice * 0.9;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price = price * (1 + (Math.random() - 0.49) * 0.025);
    data.push({
      date: date.toISOString().split("T")[0],
      open: parseFloat((price * 0.998).toFixed(2)),
      high: parseFloat((price * 1.015).toFixed(2)),
      low: parseFloat((price * 0.985).toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 500000,
    });
  }
  return data;
}

function generateMockIntraday(basePrice) {
  const data = [];
  let price = basePrice * 0.995;
  for (let i = 390; i >= 0; i -= 5) {
    const time = new Date();
    time.setMinutes(time.getMinutes() - i);
    price = price * (1 + (Math.random() - 0.499) * 0.003);
    data.push({
      time: time.toISOString(),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 100000),
    });
  }
  return data;
}

// GET /api/stocks — all stocks
router.get("/", protect, (req, res) => {
  res.json(getAllPrices());
});

// GET /api/stocks/search?q=
router.get("/search", protect, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  res.json(searchStocks(q));
});

// GET /api/stocks/:symbol — full detail with chart
router.get("/:symbol", protect, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const stock = getPrice(symbol);
  if (!stock) return res.status(404).json({ message: "Stock not found" });

  let chartData = [];
  let intradayData = [];

  // Try Finnhub for real candles
  if (FINNHUB_KEY && FINNHUB_KEY !== "your_finnhub_api_key_here") {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const oneDayAgo = now - 24 * 60 * 60;

    const [dailyCandles, intradayCandles] = await Promise.all([
      fetchCandles(symbol, "D", thirtyDaysAgo, now),
      fetchCandles(symbol, "5", oneDayAgo, now),
    ]);

    if (dailyCandles) {
      chartData = dailyCandles.t.map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split("T")[0],
        open: parseFloat(dailyCandles.o[i].toFixed(2)),
        high: parseFloat(dailyCandles.h[i].toFixed(2)),
        low: parseFloat(dailyCandles.l[i].toFixed(2)),
        close: parseFloat(dailyCandles.c[i].toFixed(2)),
        volume: dailyCandles.v[i],
      }));
    }

    if (intradayCandles) {
      intradayData = intradayCandles.t.map((ts, i) => ({
        time: new Date(ts * 1000).toISOString(),
        price: parseFloat(intradayCandles.c[i].toFixed(2)),
        volume: intradayCandles.v[i],
      }));
    }
  }

  // Fallback to mock data if Finnhub not available
  if (chartData.length === 0) chartData = generateMockChart(stock.price, 30);
  if (intradayData.length === 0) intradayData = generateMockIntraday(stock.price);

  res.json({ ...stock, chartData, intradayData });
});

module.exports = router;