// routes/withdrawalRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Account = require("../models/Account");
const Withdrawal = require("../models/Withdrawal");
const Transaction = require("../models/Transaction")
// ➕ Withdraw request
// routes/withdrawalRoutes.js - আপডেটেড ভার্সন

router.post("/request", async (req, res) => {
  try {
    const { userId, amount, accountId, password, serviceCharge, totalDeduction } = req.body;

    // ভ্যালিডেশন
    if (!userId || !amount || !accountId || !password) {
      return res.status(400).json({
        success: false,
        message: "সব তথ্য দিন"
      });
    }

    // ইউজার চেক
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ইউজার পাওয়া যায়নি"
      });
    }

    // পাসওয়ার্ড চেক
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "পাসওয়ার্ড ভুল"
      });
    }

    // ✅ ডিপোজিট চেক (শুধু স্ট্যাটাস দেখে, type নেই বলে)
    const deposits = await Transaction.find({
      userId: userId,
      status: "approved"
      // type ফিল্ড নেই বলে শুধু status দেখব
    });

    if (!deposits || deposits.length === 0) {
      return res.status(400).json({
        success: false,
        message: "আপনি এখনো ডিপোজিট করেননি! উত্তোলন করতে হলে প্রথমে ডিপোজিট করতে হবে।"
      });
    }

    // অ্যাকাউন্ট চেক
    const account = await Account.findOne({
      _id: accountId,
      userId: userId,
      isActive: true
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "অ্যাকাউন্ট পাওয়া যায়নি"
      });
    }

    const withdrawAmount = Number(amount);

    // ন্যূনতম উত্তোলন চেক
    if (withdrawAmount < 200) {
      return res.status(400).json({
        success: false,
        message: "ন্যূনতম উত্তোলন ২০০ টাকা"
      });
    }

    // সার্ভিস চার্জ ক্যালকুলেশন (১৩%)
    const calculatedServiceCharge = withdrawAmount * 0.13;
    const calculatedTotalDeduction = withdrawAmount + calculatedServiceCharge;

    const finalServiceCharge = serviceCharge || calculatedServiceCharge;
    const finalTotalDeduction = totalDeduction || calculatedTotalDeduction;

    // ব্যালেন্স চেক
    if (user.balance < finalTotalDeduction) {
      return res.status(400).json({
        success: false,
        message: `পর্যাপ্ত ব্যালেন্স নেই। প্রয়োজন: ৳${finalTotalDeduction.toFixed(2)}`
      });
    }

    // ব্যালেন্স থেকে টাকা কাটা
    user.balance -= finalTotalDeduction;
    await user.save();

    // উইথড্র রেকর্ড সেভ
    const withdrawal = new Withdrawal({
      userId: userId,
      amount: withdrawAmount,
      serviceCharge: finalServiceCharge,
      totalDeduction: finalTotalDeduction,
      accountId: account._id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      accountHolder: account.holderName,
      status: "pending",
      remainingBalance: user.balance,
      requestedAt: new Date()
    });

    await withdrawal.save();

    // ⭐ ট্রানজেকশন রেকর্ড (type ফিল্ড ছাড়া - আপনার মডেল অনুযায়ী)
    const transaction = new Transaction({
      userId: userId,
      amount: withdrawAmount,
      transactionId: `WID-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, // ইউনিক আইডি
      paymentMethod: account.accountType,
      phoneNumber: account.accountNumber,
      status: "pending"
    });

    await transaction.save();

    res.json({
      success: true,
      message: "উত্তোলন রিকোয়েস্ট সফল হয়েছে",
      data: {
        withdrawAmount: withdrawAmount,
        serviceCharge: finalServiceCharge,
        totalDeduction: finalTotalDeduction,
        newBalance: user.balance,
        withdrawalId: withdrawal._id,
        status: "pending"
      }
    });

  } catch (error) {
    console.error("Withdraw request error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "সার্ভার সমস্যা হয়েছে"
    });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({
      userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      withdrawals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ডাটা লোড করতে সমস্যা হয়েছে"
    });
  }
});

// routes/withdrawalRoutes.js

// 👨‍💼 Admin - get all withdrawals
router.get("/admin/all", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      withdrawals
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "ডাটা লোড ব্যর্থ"
    });
  }
});

// 👨‍💼 Admin approve/reject
router.put("/admin/update/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdraw পাওয়া যায়নি"
      });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Already processed"
      });
    }

    withdrawal.status = status;
    await withdrawal.save();

    res.json({
      success: true,
      message: `Withdraw ${status} হয়েছে`
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "আপডেট ব্যর্থ"
    });
  }
});

module.exports = router;