const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true },
  companyName: { type: String, required: true },
  shares: { type: Number, required: true },
  avgCost: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  sector: { type: String, default: "Unknown" },
});

const portfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    holdings: [holdingSchema],
    totalValue: { type: Number, default: 0 },
    totalPnL: { type: Number, default: 0 },
    dailyPnL: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
