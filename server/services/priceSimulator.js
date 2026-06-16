const axios = require("axios");
const WebSocket = require("ws");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 15 });
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// Top 50 stocks with fallback base prices
const STOCKS = {
  AAPL: { name: "Apple Inc.", sector: "Technology", price: 189.5 },
  MSFT: { name: "Microsoft Corp.", sector: "Technology", price: 415.2 },
  GOOGL: { name: "Alphabet Inc.", sector: "Technology", price: 175.8 },
  AMZN: { name: "Amazon.com Inc.", sector: "Consumer Cyclical", price: 196.4 },
  NVDA: { name: "NVIDIA Corp.", sector: "Technology", price: 875.4 },
  TSLA: { name: "Tesla Inc.", sector: "Consumer Cyclical", price: 248.5 },
  META: { name: "Meta Platforms Inc.", sector: "Technology", price: 505.1 },
  BRK: { name: "Berkshire Hathaway", sector: "Financial", price: 356.2 },
  LLY: { name: "Eli Lilly & Co.", sector: "Healthcare", price: 765.3 },
  V: { name: "Visa Inc.", sector: "Financial", price: 278.9 },
  JPM: { name: "JPMorgan Chase", sector: "Financial", price: 198.7 },
  UNH: { name: "UnitedHealth Group", sector: "Healthcare", price: 528.4 },
  XOM: { name: "Exxon Mobil Corp.", sector: "Energy", price: 112.6 },
  WMT: { name: "Walmart Inc.", sector: "Consumer Defensive", price: 68.9 },
  MA: { name: "Mastercard Inc.", sector: "Financial", price: 472.1 },
  PG: { name: "Procter & Gamble", sector: "Consumer Defensive", price: 162.3 },
  JNJ: { name: "Johnson & Johnson", sector: "Healthcare", price: 159.8 },
  HD: { name: "Home Depot Inc.", sector: "Consumer Cyclical", price: 378.5 },
  ORCL: { name: "Oracle Corp.", sector: "Technology", price: 127.4 },
  BAC: { name: "Bank of America", sector: "Financial", price: 34.8 },
  CVX: { name: "Chevron Corp.", sector: "Energy", price: 158.2 },
  ABBV: { name: "AbbVie Inc.", sector: "Healthcare", price: 163.7 },
  KO: { name: "Coca-Cola Co.", sector: "Consumer Defensive", price: 61.4 },
  PEP: { name: "PepsiCo Inc.", sector: "Consumer Defensive", price: 174.8 },
  MRK: { name: "Merck & Co.", sector: "Healthcare", price: 125.3 },
  COST: { name: "Costco Wholesale", sector: "Consumer Defensive", price: 748.2 },
  AVGO: { name: "Broadcom Inc.", sector: "Technology", price: 1285.6 },
  TMO: { name: "Thermo Fisher Scientific", sector: "Healthcare", price: 568.4 },
  CSCO: { name: "Cisco Systems", sector: "Technology", price: 49.8 },
  ACN: { name: "Accenture PLC", sector: "Technology", price: 358.2 },
  MCD: { name: "McDonald's Corp.", sector: "Consumer Cyclical", price: 298.7 },
  ABT: { name: "Abbott Laboratories", sector: "Healthcare", price: 114.6 },
  ADBE: { name: "Adobe Inc.", sector: "Technology", price: 524.3 },
  DHR: { name: "Danaher Corp.", sector: "Healthcare", price: 248.9 },
  CRM: { name: "Salesforce Inc.", sector: "Technology", price: 278.5 },
  TXN: { name: "Texas Instruments", sector: "Technology", price: 168.4 },
  VZ: { name: "Verizon Communications", sector: "Communication", price: 37.2 },
  NFLX: { name: "Netflix Inc.", sector: "Communication", price: 628.4 },
  INTC: { name: "Intel Corp.", sector: "Technology", price: 24.8 },
  WFC: { name: "Wells Fargo & Co.", sector: "Financial", price: 56.3 },
  PM: { name: "Philip Morris Intl.", sector: "Consumer Defensive", price: 94.7 },
  MS: { name: "Morgan Stanley", sector: "Financial", price: 98.4 },
  GS: { name: "Goldman Sachs", sector: "Financial", price: 468.2 },
  RTX: { name: "RTX Corp.", sector: "Industrials", price: 98.6 },
  NEE: { name: "NextEra Energy", sector: "Utilities", price: 68.4 },
  SCHW: { name: "Charles Schwab", sector: "Financial", price: 72.8 },
  T: { name: "AT&T Inc.", sector: "Communication", price: 17.4 },
  BMY: { name: "Bristol-Myers Squibb", sector: "Healthcare", price: 52.8 },
  AMT: { name: "American Tower", sector: "Real Estate", price: 198.6 },
  UPS: { name: "United Parcel Service", sector: "Industrials", price: 148.3 },
};

let currentPrices = {};
let finnhubWs = null;
let wssRef = null;
let usingRealPrices = false;

// Initialize with base prices
function initPrices() {
  Object.keys(STOCKS).forEach((symbol) => {
    const base = STOCKS[symbol];
    const prevClose = base.price * (1 + (Math.random() - 0.5) * 0.02);
    currentPrices[symbol] = {
      symbol,
      name: base.name,
      sector: base.sector,
      price: base.price,
      previousClose: parseFloat(prevClose.toFixed(2)),
      change: 0,
      changePercent: 0,
      open: base.price,
      high: base.price,
      low: base.price,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      lastUpdated: Date.now(),
      isReal: false,
    };
  });
}

// Fetch real quotes from Finnhub REST (used on startup & as fallback)
async function fetchRealQuotes() {
  if (!FINNHUB_KEY || FINNHUB_KEY === "your_finnhub_api_key_here") return false;

  const symbols = Object.keys(STOCKS);
  let successCount = 0;

  // Fetch in batches to avoid rate limits (60 calls/min free tier)
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    try {
      const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
      const q = res.data;

      if (q && q.c && q.c > 0) {
        currentPrices[symbol] = {
          ...currentPrices[symbol],
          price: parseFloat(q.c.toFixed(2)),
          open: parseFloat((q.o || q.c).toFixed(2)),
          high: parseFloat((q.h || q.c).toFixed(2)),
          low: parseFloat((q.l || q.c).toFixed(2)),
          previousClose: parseFloat((q.pc || q.c).toFixed(2)),
          change: parseFloat((q.d || 0).toFixed(2)),
          changePercent: parseFloat((q.dp || 0).toFixed(3)),
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          lastUpdated: Date.now(),
          isReal: true,
        };
        successCount++;
      }

      // Delay to respect rate limits (1 req per 100ms = 10/sec, safe for free tier)
      if (i < symbols.length - 1) await sleep(120);
    } catch (err) {
      // Skip failed symbols silently
    }
  }

  usingRealPrices = successCount > 10;
  console.log(`📊 Fetched real prices for ${successCount}/${symbols.length} stocks`);
  return usingRealPrices;
}

// Connect to Finnhub WebSocket for real-time trades
function connectFinnhubWebSocket() {
  if (!FINNHUB_KEY || FINNHUB_KEY === "your_finnhub_api_key_here") return;

  try {
    finnhubWs = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`);

    finnhubWs.on("open", () => {
      console.log("🔌 Finnhub WebSocket connected");
      // Subscribe to top 10 most active stocks (free tier limit)
      const topSymbols = ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "META", "AMZN", "JPM", "NFLX", "V"];
      topSymbols.forEach((sym) => {
        finnhubWs.send(JSON.stringify({ type: "subscribe", symbol: sym }));
      });
    });

    finnhubWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "trade" && msg.data) {
          const updates = [];
          msg.data.forEach((trade) => {
            const symbol = trade.s;
            if (currentPrices[symbol]) {
              const newPrice = parseFloat(trade.p.toFixed(2));
              const prevClose = currentPrices[symbol].previousClose;
              const change = parseFloat((newPrice - prevClose).toFixed(2));
              const changePercent = parseFloat(((change / prevClose) * 100).toFixed(3));

              currentPrices[symbol] = {
                ...currentPrices[symbol],
                price: newPrice,
                change,
                changePercent,
                high: Math.max(currentPrices[symbol].high, newPrice),
                low: Math.min(currentPrices[symbol].low, newPrice),
                volume: currentPrices[symbol].volume + (trade.v || 0),
                lastUpdated: Date.now(),
                isReal: true,
              };
              updates.push(currentPrices[symbol]);
            }
          });

          if (updates.length > 0 && wssRef) {
            broadcastUpdates(updates);
          }
        }
      } catch (e) {}
    });

    finnhubWs.on("error", (err) => {
      console.log("Finnhub WS error, falling back to simulation");
    });

    finnhubWs.on("close", () => {
      console.log("Finnhub WS closed, reconnecting in 10s...");
      setTimeout(connectFinnhubWebSocket, 10000);
    });
  } catch (e) {
    console.log("Finnhub WS failed, using simulation");
  }
}

// Simulate price movement for stocks not covered by Finnhub WS
function simulatePriceMovement() {
  const symbols = Object.keys(currentPrices);
  const numToUpdate = Math.floor(Math.random() * 6) + 5;
  const shuffled = [...symbols].sort(() => 0.5 - Math.random());
  const updates = [];

  for (let i = 0; i < numToUpdate; i++) {
    const symbol = shuffled[i];
    const stock = currentPrices[symbol];

    // Skip recently updated real prices (updated within last 5 seconds)
    if (stock.isReal && Date.now() - stock.lastUpdated < 5000) continue;

    const movement = (Math.random() - 0.499) * 0.003;
    const newPrice = Math.max(0.01, stock.price * (1 + movement));
    const change = newPrice - stock.previousClose;
    const changePercent = (change / stock.previousClose) * 100;

    currentPrices[symbol] = {
      ...stock,
      price: parseFloat(newPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(3)),
      high: Math.max(stock.high, newPrice),
      low: Math.min(stock.low, newPrice),
      volume: stock.volume + Math.floor(Math.random() * 10000),
      lastUpdated: Date.now(),
    };
    updates.push(currentPrices[symbol]);
  }

  return updates;
}

function broadcastUpdates(updates) {
  if (!wssRef || wssRef.clients.size === 0) return;
  const message = JSON.stringify({ type: "PRICE_UPDATE", data: updates });
  wssRef.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

async function startBroadcast(wss) {
  wssRef = wss;
  console.log("📡 Price broadcaster starting...");

  initPrices();

  // Try to fetch real prices on startup
  const hasRealPrices = await fetchRealQuotes();
  if (hasRealPrices) {
    console.log("✅ Using real Finnhub prices");
    connectFinnhubWebSocket();
    // Re-fetch REST quotes every 60 seconds for stocks not in WS feed
    setInterval(fetchRealQuotes, 60000);
  } else {
    console.log("⚠️  Finnhub API key not set or invalid — using simulated prices");
  }

  // Always run simulation loop (fills gaps for non-WS stocks)
  setInterval(() => {
    const updates = simulatePriceMovement();
    if (updates.length > 0) broadcastUpdates(updates);
  }, 1500);

  // Handle new WS connections — send full snapshot
  wss.on("connection", (ws) => {
    const snapshot = Object.values(currentPrices);
    ws.send(JSON.stringify({ type: "SNAPSHOT", data: snapshot }));
  });
}

// Stop loss checker — called by trades route
function checkStopLosses(callback) {
  return currentPrices;
}

function getPrice(symbol) {
  return currentPrices[symbol?.toUpperCase()] || null;
}

function getAllPrices() {
  return Object.values(currentPrices);
}

function searchStocks(query) {
  const q = query.toLowerCase();
  return Object.values(currentPrices).filter(
    (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { startBroadcast, getPrice, getAllPrices, searchStocks, checkStopLosses, STOCKS };