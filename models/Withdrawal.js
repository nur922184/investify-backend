// models/Withdrawal.js
const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    accountNumber: String,
    accountType: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);