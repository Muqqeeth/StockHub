const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Portfolio = require("../models/Portfolio");
const Trade = require("../models/Trade");
const User = require("../models/User");
const { getPrice } = require("../services/priceSimulator");

// GET /api/portfolio
router.get("/", protect, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });

    const user = await User.findById(req.user._id);
    let totalValue = 0;
    let totalCost = 0;

    const enrichedHoldings = portfolio.holdings.map((holding) => {
      const stockData = getPrice(holding.symbol);
      const currentPrice = stockData ? stockData.price : holding.avgCost;
      const currentValue = currentPrice * holding.shares;
      const pnl = currentValue - holding.totalCost;
      const pnlPercent = ((pnl / holding.totalCost) * 100).toFixed(2);
      totalValue += currentValue;
      totalCost += holding.totalCost;
      return {
        ...holding.toObject(),
        currentPrice,
        currentValue: parseFloat(currentValue.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent),
        change: stockData ? stockData.change : 0,
        changePercent: stockData ? stockData.changePercent : 0,
      };
    });

    const totalPnL = totalValue - totalCost;
    const portfolioWithCash = totalValue + user.balance;
    const totalReturn = ((portfolioWithCash - user.totalDeposited) / user.totalDeposited) * 100;

    res.json({
      holdings: enrichedHoldings,
      summary: {
        stockValue: parseFloat(totalValue.toFixed(2)),
        cashBalance: user.balance,
        totalPortfolioValue: parseFloat(portfolioWithCash.toFixed(2)),
        totalInvested: parseFloat(totalCost.toFixed(2)),
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        totalPnLPercent: totalCost > 0 ? parseFloat(((totalPnL / totalCost) * 100).toFixed(2)) : 0,
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        initialCapital: user.totalDeposited,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portfolio/performance
// Shows TRUE net portfolio worth (cash + stock value) over time
// Starts from account creation, always includes today's current value
router.get("/performance", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const initialCapital = user.totalDeposited || 100000;

    // Get all trades sorted oldest first
    const trades = await Trade.find({ user: req.user._id }).sort({ createdAt: 1 });

    // Determine window: account creation or 90 days ago, whichever is more recent
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    // Start from account creation date or 90 days ago
    const accountCreated = new Date(user.createdAt || ninetyDaysAgo);
    accountCreated.setHours(0, 0, 0, 0);

    const windowStart = new Date(Math.max(accountCreated.getTime(), ninetyDaysAgo.getTime()));

    // Replay ALL trades before window to get starting cash + holdings state
    let cashBalance = initialCapital;
    const holdings = {}; // { symbol: { shares, avgCost } }
    let tradeIdx = 0;

    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      const tDate = new Date(t.createdAt);
      if (tDate >= windowStart) {
        tradeIdx = i;
        break;
      }
      // Apply pre-window trade
      if (t.type === "BUY") {
        cashBalance = parseFloat((cashBalance - t.total).toFixed(2));
        if (!holdings[t.symbol]) holdings[t.symbol] = { shares: 0, avgCost: t.price };
        const ex = holdings[t.symbol];
        const ns = ex.shares + t.shares;
        holdings[t.symbol] = {
          shares: ns,
          avgCost: parseFloat(((ex.avgCost * ex.shares + t.price * t.shares) / ns).toFixed(2)),
        };
      } else {
        cashBalance = parseFloat((cashBalance + t.total).toFixed(2));
        if (holdings[t.symbol]) {
          holdings[t.symbol].shares = Math.max(0, holdings[t.symbol].shares - t.shares);
          if (holdings[t.symbol].shares === 0) delete holdings[t.symbol];
        }
      }
      // If we've processed all trades without hitting window, set tradeIdx to end
      if (i === trades.length - 1) tradeIdx = trades.length;
    }

    // Walk day by day from windowStart to today
    const result = [];
    const cursor = new Date(windowStart);

    while (cursor <= today) {
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);

      // Apply all trades on this day
      while (tradeIdx < trades.length) {
        const t = trades[tradeIdx];
        if (new Date(t.createdAt) > dayEnd) break;

        if (t.type === "BUY") {
          cashBalance = parseFloat((cashBalance - t.total).toFixed(2));
          if (!holdings[t.symbol]) holdings[t.symbol] = { shares: 0, avgCost: t.price };
          const ex = holdings[t.symbol];
          const ns = ex.shares + t.shares;
          holdings[t.symbol] = {
            shares: ns,
            avgCost: parseFloat(((ex.avgCost * ex.shares + t.price * t.shares) / ns).toFixed(2)),
          };
        } else {
          cashBalance = parseFloat((cashBalance + t.total).toFixed(2));
          if (holdings[t.symbol]) {
            holdings[t.symbol].shares = Math.max(0, holdings[t.symbol].shares - t.shares);
            if (holdings[t.symbol].shares === 0) delete holdings[t.symbol];
          }
        }
        tradeIdx++;
      }

      // TODAY: use actual current balance from DB for accuracy
      const isToday = cursor.toDateString() === new Date().toDateString();

      let stockValue = 0;
      for (const [symbol, h] of Object.entries(holdings)) {
        if (h.shares > 0) {
          const live = getPrice(symbol);
          stockValue += (live ? live.price : h.avgCost) * h.shares;
        }
      }

      // For today's point, use real balance from user document for accuracy
      const cash = isToday ? user.balance : cashBalance;
      const totalValue = parseFloat((cash + stockValue).toFixed(2));

      result.push({
        date: cursor.toISOString().split("T")[0],
        value: totalValue,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;