const express = require("express");
const router = express.Router();
const axios = require("axios");
const NodeCache = require("node-cache");
const { protect } = require("../middleware/auth");

const cache = new NodeCache({ stdTTL: 300 }); // Cache 5 minutes
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// ─── Fetch real news from Finnhub ─────────────────────────────────────────────
async function fetchFinnhubMarketNews(category = "general") {
  const cacheKey = `news_market_${category}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get(
      `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_KEY}`,
      { timeout: 5000 }
    );
    const articles = res.data.slice(0, 30).map((item, i) => ({
      id: item.id || i + 1,
      title: item.headline,
      summary: item.summary || item.headline,
      source: item.source,
      url: item.url,
      imageUrl: item.image || `https://picsum.photos/seed/${item.source}${i}/800/400`,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      category: mapFinnhubCategory(item.category),
      sentiment: guessSentiment(item.headline),
      symbol: item.related || null,
      readTime: Math.floor(Math.random() * 4) + 2,
    }));
    cache.set(cacheKey, articles);
    return articles;
  } catch (err) {
    return null;
  }
}

async function fetchFinnhubCompanyNews(symbol) {
  const cacheKey = `news_company_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const res = await axios.get(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`,
      { timeout: 5000 }
    );
    const articles = res.data.slice(0, 10).map((item, i) => ({
      id: item.id || i + 1,
      title: item.headline,
      summary: item.summary || item.headline,
      source: item.source,
      url: item.url,
      imageUrl: item.image || `https://picsum.photos/seed/${symbol}${i}/800/400`,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      category: "Company News",
      sentiment: guessSentiment(item.headline),
      symbol: symbol,
      readTime: Math.floor(Math.random() * 4) + 2,
    }));
    cache.set(cacheKey, articles);
    return articles;
  } catch (err) {
    return null;
  }
}

function mapFinnhubCategory(cat) {
  const map = {
    general: "Markets",
    forex: "Markets",
    crypto: "Markets",
    merger: "Corporate",
    technology: "Technology",
  };
  return map[cat] || "Markets";
}

function guessSentiment(headline) {
  if (!headline) return "neutral";
  const h = headline.toLowerCase();
  const positive = ["surge", "jump", "rise", "gain", "beat", "record", "high", "growth", "profit", "strong", "up", "rally", "boost", "soar", "exceed"];
  const negative = ["fall", "drop", "decline", "loss", "miss", "cut", "low", "down", "crash", "plunge", "weak", "concern", "risk", "fear", "sell"];
  const posScore = positive.filter(w => h.includes(w)).length;
  const negScore = negative.filter(w => h.includes(w)).length;
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

// ─── Fallback mock news (used when Finnhub key missing) ───────────────────────
function getMockNews() {
  return [
    { id: 1, title: "Fed Signals Potential Rate Cuts as Inflation Eases", source: "Reuters", category: "Economy", sentiment: "positive", symbol: null, summary: "Federal Reserve officials signaled openness to cutting interest rates as inflation continues to moderate toward their 2% target.", publishedAt: new Date(Date.now() - 1800000).toISOString(), imageUrl: "https://picsum.photos/seed/reuters1/800/400", url: "#", readTime: 3 },
    { id: 2, title: "NVIDIA Reports Record Revenue on AI Chip Demand", source: "Bloomberg", category: "Earnings", sentiment: "positive", symbol: "NVDA", summary: "NVIDIA posted another quarter of record revenue driven by insatiable demand for its AI accelerator chips from hyperscale cloud providers.", publishedAt: new Date(Date.now() - 3600000).toISOString(), imageUrl: "https://picsum.photos/seed/bloomberg1/800/400", url: "#", readTime: 4 },
    { id: 3, title: "Apple Unveils New AI Features Across Product Line", source: "CNBC", category: "Technology", sentiment: "positive", symbol: "AAPL", summary: "Apple announced a sweeping set of AI features coming to iPhone, iPad and Mac, positioning itself at the forefront of on-device machine learning.", publishedAt: new Date(Date.now() - 7200000).toISOString(), imageUrl: "https://picsum.photos/seed/cnbc1/800/400", url: "#", readTime: 3 },
    { id: 4, title: "Oil Prices Surge on Middle East Supply Concerns", source: "WSJ", category: "Commodities", sentiment: "negative", symbol: "XOM", summary: "Crude oil prices climbed sharply as geopolitical tensions in the Middle East raised concerns about supply disruptions.", publishedAt: new Date(Date.now() - 10800000).toISOString(), imageUrl: "https://picsum.photos/seed/wsj1/800/400", url: "#", readTime: 2 },
    { id: 5, title: "Tesla Cuts Prices Amid Rising EV Competition", source: "FT", category: "Autos", sentiment: "negative", symbol: "TSLA", summary: "Tesla reduced vehicle prices across several markets as competition from Chinese and legacy automakers intensifies.", publishedAt: new Date(Date.now() - 14400000).toISOString(), imageUrl: "https://picsum.photos/seed/ft1/800/400", url: "#", readTime: 3 },
    { id: 6, title: "Microsoft Azure Revenue Beats Estimates in Q4", source: "MarketWatch", category: "Earnings", sentiment: "positive", symbol: "MSFT", summary: "Microsoft reported strong cloud growth with Azure revenue surpassing analyst expectations, driven by AI workload adoption.", publishedAt: new Date(Date.now() - 18000000).toISOString(), imageUrl: "https://picsum.photos/seed/mw1/800/400", url: "#", readTime: 4 },
    { id: 7, title: "JPMorgan Raises S&P 500 Year-End Target", source: "Bloomberg", category: "Markets", sentiment: "positive", symbol: "JPM", summary: "JPMorgan strategists lifted their S&P 500 price target citing resilient corporate earnings and expectations of a soft economic landing.", publishedAt: new Date(Date.now() - 21600000).toISOString(), imageUrl: "https://picsum.photos/seed/jpm1/800/400", url: "#", readTime: 2 },
    { id: 8, title: "Amazon Announces $10B Share Buyback Program", source: "Reuters", category: "Corporate", sentiment: "positive", symbol: "AMZN", summary: "Amazon's board approved a $10 billion share repurchase program signaling confidence in the company long-term growth trajectory.", publishedAt: new Date(Date.now() - 25200000).toISOString(), imageUrl: "https://picsum.photos/seed/amzn1/800/400", url: "#", readTime: 2 },
    { id: 9, title: "Meta Platforms Hits All-Time High on AI Revenue Growth", source: "CNBC", category: "Technology", sentiment: "positive", symbol: "META", summary: "Meta shares reached a record high after the company reported advertising revenue growth fueled by AI-powered ad targeting improvements.", publishedAt: new Date(Date.now() - 28800000).toISOString(), imageUrl: "https://picsum.photos/seed/meta1/800/400", url: "#", readTime: 3 },
    { id: 10, title: "US Jobless Claims Fall to 4-Month Low", source: "Reuters", category: "Economy", sentiment: "positive", symbol: null, summary: "Weekly jobless claims declined more than expected, pointing to continued resilience in the US labor market despite elevated interest rates.", publishedAt: new Date(Date.now() - 32400000).toISOString(), imageUrl: "https://picsum.photos/seed/econ1/800/400", url: "#", readTime: 2 },
    { id: 11, title: "Goldman Sachs Upgrades Forecast Amid Strong Earnings", source: "Bloomberg", category: "Markets", sentiment: "positive", symbol: "GS", summary: "Goldman Sachs raised its US equity market forecast after better-than-expected corporate earnings results in the latest reporting season.", publishedAt: new Date(Date.now() - 36000000).toISOString(), imageUrl: "https://picsum.photos/seed/gs1/800/400", url: "#", readTime: 3 },
    { id: 12, title: "Netflix Subscriber Growth Exceeds Expectations", source: "CNBC", category: "Earnings", sentiment: "positive", symbol: "NFLX", summary: "Netflix added more subscribers than analysts had forecast, boosted by its password-sharing crackdown and continued investment in original content.", publishedAt: new Date(Date.now() - 39600000).toISOString(), imageUrl: "https://picsum.photos/seed/nflx1/800/400", url: "#", readTime: 3 },
  ];
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/news
router.get("/", protect, async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    let articles = [];

    if (FINNHUB_KEY && FINNHUB_KEY !== "your_finnhub_api_key_here") {
      // Fetch real news from Finnhub
      const [generalNews, mergerNews] = await Promise.all([
        fetchFinnhubMarketNews("general"),
        fetchFinnhubMarketNews("merger"),
      ]);
      articles = [...(generalNews || []), ...(mergerNews || [])];
    }

    // Fall back to mock if Finnhub fails or key not set
    if (!articles.length) articles = getMockNews();

    // Filter by category
    if (category && category !== "All") {
      articles = articles.filter((a) => a.category === category);
    }

    // Sort newest first
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Deduplicate by title
    const seen = new Set();
    articles = articles.filter((a) => {
      if (seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    });

    const start = (page - 1) * limit;
    const paginated = articles.slice(start, start + parseInt(limit));

    const categories = ["All", "Markets", "Earnings", "Technology", "Economy", "Corporate", "Commodities", "Company News"];

    res.json({
      articles: paginated,
      total: articles.length,
      pages: Math.ceil(articles.length / limit),
      categories,
      isRealData: !!(FINNHUB_KEY && FINNHUB_KEY !== "your_finnhub_api_key_here"),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/news/:symbol — company specific news
router.get("/:symbol", protect, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    let articles = [];

    if (FINNHUB_KEY && FINNHUB_KEY !== "your_finnhub_api_key_here") {
      articles = await fetchFinnhubCompanyNews(symbol) || [];
    }

    // Fallback
    if (!articles.length) {
      articles = getMockNews().filter((a) => a.symbol === symbol).slice(0, 5);
    }

    res.json({ articles: articles.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;