// Add this to your existing investment routes file
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Investment = require("../models/Investment"); // Make sure you have this model

// 👉 CREATE INVESTMENT (WITH BALANCE DEDUCTION)
// routes/investmentRoutes.js বা যেখানে পোস্ট API আছে (আপডেটেড ভার্সন)

router.post("/create", async (req, res) => {
  try {
    const {
      userId,
      productId,
      productName,
      amount,
      dailyIncome,
      duration,
      totalIncome,
      productType  // ✅ নতুন: "free" বা "paid"
    } = req.body;

    // Validate required fields
    if (!userId || !productId) {
      return res.status(400).json({ message: "সব তথ্য প্রয়োজন" });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });
    }

    // ✅ ফ্রি প্রোডাক্ট চেক করা
    const isFreeProduct = productType === "free" || amount === 0;

    // ✅ ফ্রি প্রোডাক্ট আগে নিয়েছে কিনা চেক করা
    if (isFreeProduct) {
      const existingFreeInvestment = await Investment.findOne({
        userId,
        productType: "free"
      });

      if (existingFreeInvestment) {
        return res.status(400).json({
          message: "আপনি ইতিমধ্যে বিআইপি (ফ্রি) প্যাকেজটি নিয়ে ফেলেছেন! প্রতিটি ইউজার শুধুমাত্র একবার এই প্যাকেজ নিতে পারবেন।"
        });
      }
    }

    // ✅ পেইড প্রোডাক্টের জন্য ব্যালেন্স চেক
    const finalAmount = amount || 0;

    if (!isFreeProduct && user.balance < finalAmount) {
      return res.status(400).json({
        message: "অপর্যাপ্ত ব্যালেন্স!",
        currentBalance: user.balance,
        required: finalAmount
      });
    }

    // Parse duration (যেমন: "৪ দিন" বা "90 days" থেকে সংখ্যা বের করা)
    let remainingDays = 4; // default
    if (duration) {
      // বাংলা ও ইংরেজি উভয় সংখ্যা সাপোর্ট করবে
      const daysMatch = duration.match(/\d+/);
      if (daysMatch) {
        remainingDays = parseInt(daysMatch[0]);
      }
    }

    // ✅ শুধু পেইড প্রোডাক্টের জন্য ব্যালেন্স কাটবে
    if (!isFreeProduct) {
      user.balance = user.balance - finalAmount;
      await user.save();
    }

    // ✅ Investment রেকর্ড তৈরি করা
    const investment = new Investment({
      userId,
      productId,
      productName,
      amount: finalAmount,
      dailyIncome: dailyIncome || 0,
      duration: duration || "অনির্দিষ্ট",
      totalIncome: totalIncome || 0,
      remainingDays: remainingDays,
      status: "active",
      startDate: new Date(),
      lastClaimDate: null,  // ✅ null - মানে এখনই ক্লেইম করতে পারবে
      nextClaimAvailableTime: null,  // ✅ প্রথমবার ক্লেইমের জন্য কোনো বাধা নেই
      totalClaimed: 0,
      productType: isFreeProduct ? "free" : "paid"  // ✅ টাইপ সেভ করা
    });

    await investment.save();

    res.status(201).json({
      success: true,
      message: isFreeProduct
        ? "অভিনন্দন! 🎁 বিআইপি (ফ্রি) প্যাকেজ সফলভাবে নেওয়া হয়েছে! দৈনিক আয় শুরু হয়েছে।"
        : "বিনিয়োগ সফল হয়েছে!",
      investment,
      newBalance: user.balance,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "সার্ভার সমস্যা হয়েছে" });
  }
});

// 👉 GET USER INVESTMENTS
router.get("/user/:userId", async (req, res) => {
  try {
    const investments = await Investment.find({
      userId: req.params.userId,
      status: "active"
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: investments.length,
      investments,
    });
  } catch (err) {
    res.status(500).json({ message: "সার্ভার সমস্যা হয়েছে" });
  }
});

// 👉 CLAIM DAILY INCOME
router.post("/claim/:investmentId", async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.investmentId);

    if (!investment) {
      return res.status(404).json({ message: "বিনিয়োগ পাওয়া যায়নি" });
    }

    if (investment.status !== "active") {
      return res.status(400).json({ message: "এই বিনিয়োগ সক্রিয় নয়" });
    }

    const now = new Date();

    // 24h check
    if (investment.lastClaimDate) {
      const diff = now - new Date(investment.lastClaimDate);
      if (diff < 24 * 60 * 60 * 1000) {
        const remain = 24 * 60 * 60 * 1000 - diff;
        return res.status(400).json({
          message: "আজকে ইতিমধ্যে আয় ক্লেইম করেছেন",
          remainingTime: remain,
        });
      }
    }

    const dailyEarning = investment.dailyIncome;

    // user update
    const user = await User.findById(investment.userId);
    user.balance += dailyEarning;
    await user.save();

    // investment update
    investment.lastClaimDate = now;
    investment.remainingDays -= 1;

    if (investment.remainingDays <= 0) {
      investment.status = "completed";
    }

    await investment.save();

    return res.json({
      success: true,
      message: `আজকের আয় ৳${dailyEarning} ক্লেইম করেছেন!`,
      claimedAmount: dailyEarning,
      newBalance: user.balance,
      investment, // ✅ IMPORTANT FIX
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "সার্ভার সমস্যা হয়েছে" });
  }
});

module.exports = router;