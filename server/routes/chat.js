const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/auth");
const { getPrice, getAllPrices } = require("../services/priceSimulator");
const Portfolio = require("../models/Portfolio");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

router.post("/", protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ message: "Message required" });

    const allStocks = getAllPrices().slice(0, 10);
    const marketSummary = allStocks
      .map((s) => `${s.symbol}: $${s.price} (${s.changePercent > 0 ? "+" : ""}${s.changePercent}%)`)
      .join(", ");

    const mentionedSymbol = message.match(/\b([A-Z]{1,5})\b/)?.[1];
    let stockContext = "";
    if (mentionedSymbol) {
      const stock = getPrice(mentionedSymbol);
      if (stock) {
        stockContext = `\nCurrent ${stock.symbol} data: Price: $${stock.price}, Change: ${stock.changePercent}%, High: $${stock.high}, Low: $${stock.low}`;
      }
    }

    // Fetch user portfolio
    let portfolioContext = "";
    try {
      const portfolio = await Portfolio.findOne({ user: req.user._id });
      if (portfolio && portfolio.holdings.length > 0) {
        const holdingsSummary = portfolio.holdings.map((h) => {
          const live = getPrice(h.symbol);
          const currentPrice = live ? live.price : h.avgCost;
          const pnl = ((currentPrice - h.avgCost) * h.shares).toFixed(2);
          const pnlPercent = (((currentPrice - h.avgCost) / h.avgCost) * 100).toFixed(2);
          return `  - ${h.symbol} (${h.companyName}): ${h.shares} shares | Avg Cost: $${h.avgCost} | Current: $${currentPrice} | P&L: $${pnl} (${pnlPercent}%)`;
        }).join("\n");
        const totalStockValue = portfolio.holdings.reduce((sum, h) => {
          const live = getPrice(h.symbol);
          return sum + (live ? live.price : h.avgCost) * h.shares;
        }, 0).toFixed(2);
        portfolioContext = `\n\nUser's Current Portfolio:
${holdingsSummary}
  - Cash Balance: $${req.user.balance?.toFixed(2)}
  - Total Stock Value: $${totalStockValue}
  - Total Portfolio Value: $${(parseFloat(totalStockValue) + parseFloat(req.user.balance)).toFixed(2)}`;
      } else {
        portfolioContext = `\n\nUser's Portfolio: No holdings yet. Cash Balance: $${req.user.balance?.toFixed(2)}`;
      }
    } catch (e) {
      console.error("Portfolio fetch error:", e.message);
    }

    const systemPrompt = `You are StockHub AI, a professional financial advisor and market analyst assistant for a paper trading platform. You help users understand markets, analyze stocks, develop trading strategies, and learn about investing.

Current Market Snapshot (Top stocks): ${marketSummary}
${stockContext}
${portfolioContext}

Important guidelines:
- Always remind users this is a paper trading platform (not real money)
- You have full access to the user's portfolio above — use it to give personalized advice
- Provide educational, balanced financial advice
- Explain technical concepts clearly
- Never guarantee profits or give specific buy/sell recommendations
- Be professional, concise, and helpful
- Use $ for prices and % for percentages
- Format your responses clearly with proper structure`;

    if (!GROQ_API_KEY) {
      const responses = [
        `Based on current market conditions, ${message.toLowerCase().includes("buy") ? "it's important to consider your risk tolerance before making any trading decisions." : "diversification remains a key strategy for managing portfolio risk."}`,
        "As a paper trading platform, this is a great opportunity to practice without real financial risk. Consider studying technical analysis patterns to improve your strategy.",
        "The market shows mixed signals today. Consider reviewing your portfolio allocation and ensuring you're not overexposed to any single sector.",
        "Remember: successful trading involves discipline, risk management, and continuous learning. What specific aspect of trading would you like to explore?",
      ];
      return res.json({
        response: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
      });
    }

    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.slice(-6).map((h) => ({
            role: h.role === "user" ? "user" : "assistant",
            content: h.content,
          })),
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    res.json({ response: aiResponse, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Chat error:", err.response?.data || err.message);
    res.json({
      response: "I'm experiencing a brief interruption. Please try again in a moment. In the meantime, remember that successful investing requires patience, research, and proper risk management.",
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;