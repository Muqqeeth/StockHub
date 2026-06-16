const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Trade = require("../models/Trade");
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const { getPrice } = require("../services/priceSimulator");

// ─── Stop Loss Engine ─────────────────────────────────────────────────────────
let wssInstance = null;

function setWss(wss) {
  wssInstance = wss;
}

function broadcastStopLoss(payload) {
  if (!wssInstance) return;
  const WebSocket = require("ws");
  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

setInterval(async () => {
  try {
    const activeTrades = await Trade.find({
      type: "BUY",
      stopLoss: { $ne: null },
      stopLossTriggered: false,
    }).populate("user");

    for (const trade of activeTrades) {
      const currentData = getPrice(trade.symbol);
      if (!currentData) continue;
      const currentPrice = currentData.price;

      if (currentPrice <= trade.stopLoss) {
        const user = await User.findById(trade.user._id);
        const portfolio = await Portfolio.findOne({ user: trade.user._id });

        if (!portfolio) { trade.stopLossTriggered = true; await trade.save(); continue; }

        const holdingIdx = portfolio.holdings.findIndex((h) => h.symbol === trade.symbol);
        if (holdingIdx < 0) { trade.stopLossTriggered = true; await trade.save(); continue; }

        const holding = portfolio.holdings[holdingIdx];
        const sharesToSell = holding.shares;
        const total = parseFloat((currentPrice * sharesToSell).toFixed(2));
        const pnl = parseFloat(((currentPrice - holding.avgCost) * sharesToSell).toFixed(2));

        user.balance = parseFloat((user.balance + total).toFixed(2));
        await user.save();

        portfolio.holdings.splice(holdingIdx, 1);
        await portfolio.save();

        await Trade.create({
          user: trade.user._id,
          symbol: trade.symbol,
          companyName: trade.companyName,
          type: "SELL",
          shares: sharesToSell,
          price: currentPrice,
          total,
          pnl,
          status: "STOP_LOSS_TRIGGERED",
        });

        trade.stopLossTriggered = true;
        await trade.save();

        // Broadcast to frontend so balance updates immediately
        broadcastStopLoss({
          type: "STOP_LOSS_TRIGGERED",
          symbol: trade.symbol,
          shares: sharesToSell,
          price: currentPrice,
          total,
          pnl,
          newBalance: user.balance,
          message: `Stop loss triggered: ${trade.symbol} sold ${sharesToSell} shares at $${currentPrice.toFixed(2)}`,
        });

        console.log(`🛑 Stop loss triggered: ${trade.symbol} | ${sharesToSell} shares @ $${currentPrice} | New balance: $${user.balance}`);
      }
    }
  } catch (err) {}
}, 5000);

// ─── Execute Trade ────────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { symbol, type, shares, stopLoss } = req.body;
    if (!symbol || !type || !shares || shares <= 0) return res.status(400).json({ message: "Invalid trade data" });
    if (!Number.isInteger(Number(shares))) return res.status(400).json({ message: "Shares must be a whole number" });

    const stockData = getPrice(symbol);
    if (!stockData) return res.status(404).json({ message: "Stock not found" });

    const price = stockData.price;
    const total = parseFloat((price * shares).toFixed(2));
    const user = await User.findById(req.user._id);
    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });

    if (type === "BUY" && stopLoss !== undefined && stopLoss !== null && stopLoss !== "") {
      const sl = parseFloat(stopLoss);
      if (isNaN(sl) || sl <= 0) return res.status(400).json({ message: "Stop loss must be a positive number" });
      if (sl >= price) return res.status(400).json({ message: `Stop loss ($${sl}) must be below current price ($${price.toFixed(2)})` });
    }

    if (type === "BUY") {
      if (user.balance < total) return res.status(400).json({ message: `Insufficient funds. Need $${total.toFixed(2)}, have $${user.balance.toFixed(2)}` });

      user.balance = parseFloat((user.balance - total).toFixed(2));
      await user.save();

      const holdingIdx = portfolio.holdings.findIndex((h) => h.symbol === symbol.toUpperCase());
      if (holdingIdx >= 0) {
        const holding = portfolio.holdings[holdingIdx];
        const newShares = holding.shares + Number(shares);
        const newTotalCost = holding.totalCost + total;
        portfolio.holdings[holdingIdx].shares = newShares;
        portfolio.holdings[holdingIdx].avgCost = parseFloat((newTotalCost / newShares).toFixed(2));
        portfolio.holdings[holdingIdx].totalCost = parseFloat(newTotalCost.toFixed(2));
      } else {
        portfolio.holdings.push({ symbol: symbol.toUpperCase(), companyName: stockData.name, shares: Number(shares), avgCost: price, totalCost: total, sector: stockData.sector });
      }
      await portfolio.save();

      const trade = await Trade.create({
        user: req.user._id, symbol: symbol.toUpperCase(), companyName: stockData.name,
        type, shares: Number(shares), price, total,
        stopLoss: stopLoss && stopLoss !== "" ? parseFloat(stopLoss) : null,
      });

      return res.status(201).json({ trade, balance: user.balance, message: `BUY executed: ${shares} shares of ${symbol} at $${price.toFixed(2)}${stopLoss ? ` | Stop loss: $${parseFloat(stopLoss).toFixed(2)}` : ""}` });

    } else if (type === "SELL") {
      const holdingIdx = portfolio.holdings.findIndex((h) => h.symbol === symbol.toUpperCase());
      if (holdingIdx < 0) return res.status(400).json({ message: "You don't own this stock" });

      const holding = portfolio.holdings[holdingIdx];
      if (holding.shares < Number(shares)) return res.status(400).json({ message: `You only have ${holding.shares} shares of ${symbol}` });

      const pnl = parseFloat(((price - holding.avgCost) * Number(shares)).toFixed(2));
      user.balance = parseFloat((user.balance + total).toFixed(2));
      await user.save();

      if (holding.shares === Number(shares)) {
        portfolio.holdings.splice(holdingIdx, 1);
        await Trade.updateMany({ user: req.user._id, symbol: symbol.toUpperCase(), type: "BUY", stopLossTriggered: false, stopLoss: { $ne: null } }, { stopLossTriggered: true });
      } else {
        portfolio.holdings[holdingIdx].shares -= Number(shares);
        portfolio.holdings[holdingIdx].totalCost = parseFloat((portfolio.holdings[holdingIdx].avgCost * portfolio.holdings[holdingIdx].shares).toFixed(2));
      }
      await portfolio.save();

      const trade = await Trade.create({ user: req.user._id, symbol: symbol.toUpperCase(), companyName: stockData.name, type, shares: Number(shares), price, total, pnl });
      return res.status(201).json({ trade, balance: user.balance, message: `SELL executed: ${shares} shares of ${symbol} at $${price.toFixed(2)} | P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Update Stop Loss ─────────────────────────────────────────────────────────
router.put("/stoploss/:symbol", protect, async (req, res) => {
  try {
    const { stopLoss } = req.body;
    const symbol = req.params.symbol.toUpperCase();
    const currentData = getPrice(symbol);
    if (!currentData) return res.status(404).json({ message: "Stock not found" });

    if (stopLoss !== null && stopLoss !== "") {
      const sl = parseFloat(stopLoss);
      if (isNaN(sl) || sl <= 0) return res.status(400).json({ message: "Stop loss must be a positive number" });
      if (sl >= currentData.price) return res.status(400).json({ message: `Stop loss must be below current price $${currentData.price.toFixed(2)}` });
    }

    await Trade.updateMany(
      { user: req.user._id, symbol, type: "BUY", stopLossTriggered: false },
      { stopLoss: stopLoss && stopLoss !== "" ? parseFloat(stopLoss) : null }
    );
    res.json({ message: stopLoss ? `Stop loss updated to $${parseFloat(stopLoss).toFixed(2)} for ${symbol}` : `Stop loss removed for ${symbol}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get Active Stop Losses ───────────────────────────────────────────────────
router.get("/stoploss", protect, async (req, res) => {
  try {
    const activeSL = await Trade.find({ user: req.user._id, type: "BUY", stopLoss: { $ne: null }, stopLossTriggered: false })
      .select("symbol companyName stopLoss shares price createdAt");

    const enriched = activeSL.map((t) => {
      const live = getPrice(t.symbol);
      return { ...t.toObject(), currentPrice: live?.price || null, distancePercent: live ? parseFloat((((live.price - t.stopLoss) / live.price) * 100).toFixed(2)) : null };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Trade History ────────────────────────────────────────────────────────────
router.get("/history", protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, symbol } = req.query;
    const query = { user: req.user._id };
    if (symbol) query.symbol = symbol.toUpperCase();
    const trades = await Trade.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Trade.countDocuments(query);
    res.json({ trades, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Trade Stats ──────────────────────────────────────────────────────────────
router.get("/stats", protect, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id });
    const totalTrades = trades.length;
    const buyTrades = trades.filter((t) => t.type === "BUY").length;
    const sellTrades = trades.filter((t) => t.type === "SELL").length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = trades.filter((t) => t.pnl > 0).length;
    const stopLossHits = trades.filter((t) => t.status === "STOP_LOSS_TRIGGERED").length;
    const winRate = sellTrades > 0 ? ((winningTrades / sellTrades) * 100).toFixed(1) : 0;
    res.json({ totalTrades, buyTrades, sellTrades, totalPnL: parseFloat(totalPnL.toFixed(2)), winRate, stopLossHits });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.setWss = setWss;