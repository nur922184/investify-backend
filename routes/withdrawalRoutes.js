// routes/withdrawalRoutes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Account = require("../models/Account");
const Withdrawal = require("../models/Withdrawal");

// ➕ Withdraw request
router.post("/request", async (req, res) => {
  try {
    const { userId, amount, accountId, password } = req.body;

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

    // অ্যাকাউন্ট চেক
    const account = await Account.findOne({
      _id: accountId,
      userId,
      isActive: true
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "অ্যাকাউন্ট পাওয়া যায়নি"
      });
    }

    const withdrawAmount = Number(amount);
    
    // ✅ সার্ভিস চার্জ ক্যালকুলেশন (৫%)
    const serviceCharge = withdrawAmount * 0.05;
    const totalDeduction = withdrawAmount + serviceCharge;

    // ✅ ব্যালেন্স চেক (মোট কাটার সাথে তুলনা করা হবে)
    if (user.balance < totalDeduction) {
      return res.status(400).json({
        success: false,
        message: `পর্যাপ্ত ব্যালেন্স নেই। প্রয়োজন: ৳${totalDeduction.toFixed(2)} (উত্তোলন: ৳${withdrawAmount} + চার্জ: ৳${serviceCharge.toFixed(2)})`,
        required: totalDeduction,
        currentBalance: user.balance
      });
    }

    // ✅ ব্যালেন্স থেকে মোট টাকা কাটা হবে
    user.balance -= totalDeduction;
    await user.save();

    // ✅ উইথড্র রেকর্ড সেভ করা (সার্ভিস চার্জ সহ)
    const withdrawal = new Withdrawal({
      userId,
      amount: withdrawAmount,
      serviceCharge: serviceCharge,
      totalDeduction: totalDeduction,
      accountId: account._id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      accountHolder: account.holderName,
      status: "pending",
      remainingBalance: user.balance,
      requestedAt: new Date()
    });

    await withdrawal.save();

    res.json({
      success: true,
      message: "উত্তোলন রিকোয়েস্ট সফল হয়েছে",
      data: {
        withdrawAmount,
        serviceCharge,
        totalDeduction,
        newBalance: user.balance,
        withdrawalId: withdrawal._id
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