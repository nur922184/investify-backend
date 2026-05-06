// routes/authRoutes.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// 📱 Send OTP
router.post("/forgot-password-phone", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "ফোন নম্বর দিন"
      });
    }

    // 🔍 user check by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "এই নম্বর দিয়ে কোন ইউজার নেই"
      });
    }

    // 🔢 OTP generate
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOTP = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;

    await user.save();

    // ⚠️ এখন console (real project এ SMS API)
    console.log("OTP:", otp);

    res.json({
      success: true,
      message: "OTP পাঠানো হয়েছে"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "সার্ভার সমস্যা"
    });
  }
});

// Reset password via phone

router.post("/reset-password-phone", async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    const user = await User.findOne({ phone });

    if (!user || user.resetOTP !== otp || user.otpExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP ভুল বা মেয়াদ শেষ"
      });
    }

    // 🔒 hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetOTP = null;
    user.otpExpire = null;

    await user.save();

    res.json({
      success: true,
      message: "পাসওয়ার্ড পরিবর্তন হয়েছে"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "সার্ভার সমস্যা"
    });
  }
});

module.exports = router;