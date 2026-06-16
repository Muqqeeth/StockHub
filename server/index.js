require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const stockRoutes = require("./routes/stocks");
const portfolioRoutes = require("./routes/portfolio");
const tradesRouter = require("./routes/trades");
const newsRoutes = require("./routes/news");
const chatRoutes = require("./routes/chat");

const app = express();
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocket.Server({ server, path: "/ws" });
const priceSimulator = require("./services/priceSimulator");
priceSimulator.startBroadcast(wss);

// Give the trades route access to wss so stop loss can broadcast balance updates
tradesRouter.setWss(wss);

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use("/api/", limiter);

app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/trades", tradesRouter);
app.use("/api/news", newsRoutes);
app.use("/api/chat", chatRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/trading_platform";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));