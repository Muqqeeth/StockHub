# TradeX — Professional Paper Trading Platform

A full-stack MERN application for paper trading with real-time simulated prices, portfolio tracking, market news, and an AI-powered chat advisor.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas free tier)

### 1. Clone & Install

```bash
# Server
cd server
npm install
cp .env.example .env
# Edit .env with your API keys

# Client
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/trading_platform
JWT_SECRET=your_super_secret_key_change_this

# Optional — real AI chat responses
GEMINI_API_KEY=your_gemini_key_from_aistudio.google.com

# Optional — real news articles
NEWS_API_KEY=your_key_from_newsapi.org
```

### 3. Run

```bash
# Terminal 1 — Start MongoDB
mongod

# Terminal 2 — Start server
cd server && npm run dev

# Terminal 3 — Start client
cd client && npm start
```

Open **http://localhost:3000**

---

## 🔑 API Keys (All Free Tier)

| Service | Purpose | Link |
|---|---|---|
| **Gemini AI** | AI chat advisor | [aistudio.google.com](https://aistudio.google.com) |
| **NewsAPI** | Real market news | [newsapi.org](https://newsapi.org) |

> Without API keys, the app still works fully — it uses intelligent mock data for news and fallback responses for the AI chat.

---

## 📱 Features

| Feature | Description |
|---|---|
| 💰 **Paper Trading** | Start with $100,000 virtual money |
| 📈 **Live Prices** | WebSocket price feed, 50 stocks, updates every 1.5s |
| 🔍 **Stock Search** | Search by ticker or company name |
| 📊 **Charts** | Intraday + multi-day charts with Recharts |
| 🗂️ **Portfolio** | Holdings, sector allocation, P&L tracking |
| 📰 **News Feed** | Categorized financial news with sentiment tags |
| 📋 **Trade History** | Full audit log with pagination |
| 🤖 **AI Advisor** | Gemini-powered chat with live market context |
| 🔐 **Auth** | JWT-based register/login |

---

## 🏗️ Architecture

```
tradex/
├── server/                     # Express + MongoDB
│   ├── index.js                # Entry point + WebSocket server
│   ├── models/                 # Mongoose schemas
│   │   ├── User.js
│   │   ├── Portfolio.js
│   │   └── Trade.js
│   ├── routes/                 # REST API endpoints
│   │   ├── auth.js             # POST /login, /register
│   │   ├── stocks.js           # GET /stocks, /stocks/:symbol
│   │   ├── trades.js           # POST /trades, GET /history
│   │   ├── portfolio.js        # GET /portfolio
│   │   ├── news.js             # GET /news
│   │   └── chat.js             # POST /chat (Gemini)
│   └── services/
│       └── priceSimulator.js   # WebSocket price engine
│
└── client/src/                 # React 18
    ├── App.js                  # Router + Auth guard
    ├── context/
    │   ├── AuthContext.js      # JWT auth state
    │   └── PricesContext.js    # Live price state
    ├── hooks/
    │   └── useWebSocket.js     # WS connection + flash
    ├── components/Layout/      # Sidebar + Header
    └── pages/
        ├── DashboardPage.jsx   # Overview + charts
        ├── MarketsPage.jsx     # All stocks table
        ├── TradePage.jsx       # Buy/sell + chart
        ├── PortfolioPage.jsx   # Holdings + pie chart
        ├── NewsPage.jsx        # News feed
        ├── HistoryPage.jsx     # Trade log
        └── ChatPage.jsx        # AI advisor
```

---

## 🛠️ Tech Stack

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- WebSocket (ws)
- JWT + bcryptjs
- node-cache

**Frontend**
- React 18 + React Router v6
- Recharts (area, pie charts)
- CSS Modules (no Tailwind — pure CSS vars)
- react-hot-toast
- Framer Motion ready

**AI**
- Google Gemini 1.5 Flash API

---

## 📌 Notes

- All prices are **simulated** — not connected to real exchanges
- This is a **paper trading platform only** — no real money
- Prices update every ~1.5 seconds via WebSocket
- 50 major US stocks are tracked (S&P 500 top holdings)
