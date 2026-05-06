// models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  dailyIncome: {
    type: Number,
    default: 0
  },
  duration: {
    type: String,
    default: "অনির্দিষ্ট"
  },
  totalIncome: {
    type: Number,
    default: 0
  },
  remainingDays: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  lastClaimDate: {
    type: Date,
    default: null  // ✅ গুরুত্বপূর্ণ: null সেট করা হয়েছে
  },
  nextClaimAvailableTime: {
    type: Date,
    default: null  // ✅ কখন পরবর্তী ক্লেইম করতে পারবে
  },
  totalClaimed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Investment', investmentSchema);