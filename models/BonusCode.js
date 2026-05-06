// models/BonusCode.js
const mongoose = require("mongoose");

const bonusCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  amount: {
    type: Number,
    default: 50
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    usedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxUses: {
    type: Number,
    default: 100
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("BonusCode", bonusCodeSchema);