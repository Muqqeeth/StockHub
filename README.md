# StockHub

A full-stack paper trading platform built with the MERN stack. Users get $100,000 in virtual money to buy and sell stocks with real-time price updates, a server-side stop-loss engine, and an AI-powered chatbot.

## Features

- **Real-time prices** via Finnhub WebSocket feed — falls back to simulated prices if API is unavailable
- **Paper trading** — buy and sell stocks with virtual money, no real money involved
- **Stop-loss engine** — server-side logic that auto-sells a stock when it drops below your set price and instantly pushes the updated balance to your screen
- **AI chatbot** — powered by Groq (LLaMA 3.3-70B) for trading insights and market questions
- **JWT authentication** — secure login and registration with bcrypt password hashing
- **Portfolio tracking** — view holdings, profit/loss, and trade history
- **Stock news feed** — latest market news via NewsAPI
- **Rate limiting** — 200 requests per 15 minutes per IP

## Tech Stack

**Frontend**
- React
- Context API for state management
- WebSocket client for live price updates
- CSS Modules

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- WebSocket (ws library)
- JWT + bcrypt for auth
- Axios for external API calls

**External APIs**
- Finnhub — real-time stock prices and candle data
- Groq (LLaMA 3.3-70B) — AI chatbot
- NewsAPI — market news

## Project Structure

```
StockHub/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Layout, Header, Sidebar
│       ├── context/         # Auth and Prices context
│       ├── hooks/           # useWebSocket hook
│       ├── pages/           # Dashboard, Trade, Portfolio, Chat, News
│       └── services/        # API calls
│
└── server/                  # Express backend
    ├── middleware/           # JWT auth middleware
    ├── models/              # User, Portfolio, Trade, Stock schemas
    ├── routes/              # auth, stocks, portfolio, trades, news, chat
    └── services/            # priceSimulator, newsService, aiService
```

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB running locally or a MongoDB Atlas URI
- Finnhub API key (free at finnhub.io)
- NewsAPI key (free at newsapi.org)
- Groq API key (free at console.groq.com)

### Setup

**1. Clone the repo**
```bash
git clone https://github.com/Muqqeeth/StockHub.git
cd StockHub
```

**2. Setup the server**
```bash
cd server
npm install
cp .env.example .env
# Fill in your API keys in .env
```

**3. Setup the client**
```bash
cd ../client
npm install
```

**4. Run both**

In one terminal:
```bash
cd server
npm start
```

In another terminal:
```bash
cd client
npm start
```

App runs at `http://localhost:3000`, server at `http://localhost:5000`.

## Environment Variables

Create a `.env` file inside the `server/` folder using `.env.example` as reference:

```
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
FINNHUB_API_KEY=your_finnhub_key
NEWS_API_KEY=your_newsapi_key
```

## How the Stop-Loss Works

When a user sets a stop-loss on a stock, the server monitors live prices in `priceSimulator.js`. When the price drops below the set threshold, the server automatically executes a sell order and broadcasts the updated balance to the user's browser via WebSocket — no page refresh needed.

