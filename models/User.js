const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },

  // ✅ ADD THESE TWO
  refCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: String,
    default: null,
  },
  isBlocked: {
  type: Boolean,
  default: false
},
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);