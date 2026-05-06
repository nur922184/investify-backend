const mongoose = require("mongoose");

const bonusSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  claimed: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Bonus", bonusSchema);