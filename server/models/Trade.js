const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true, uppercase: true },
    companyName: { type: String, required: true },
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    shares: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ["EXECUTED", "PENDING", "CANCELLED", "STOP_LOSS_TRIGGERED"], default: "EXECUTED" },
    pnl: { type: Number, default: 0 },
    stopLoss: { type: Number, default: null }, // Stop loss price, null = no stop loss
    stopLossTriggered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ symbol: 1 });
tradeSchema.index({ stopLoss: 1, stopLossTriggered: 1 }); // For efficient stop loss queries

module.exports = mongoose.model("Trade", tradeSchema);