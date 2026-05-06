// routes/transactionRoutes.js - সম্পূর্ণ ফুল কোড
const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// ==================== HELPER FUNCTION ====================
// রেফারেল কমিশন বিতরণের জন্য হেল্পার ফাংশন
const distributeReferralCommission = async (userId, depositAmount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { level1: false, level2: false, level3: false, details: [] };

    const commissionDetails = [];
    
    // Level 1: 10% (উপরে যিনি রেফার করেছেন)
    if (user.referredBy) {
      const level1User = await User.findOne({ refCode: user.referredBy });
      if (level1User && !level1User.isBlocked) {
        const level1Commission = depositAmount * 0.10; // 10%
        level1User.balance += level1Commission;
        await level1User.save();
        
        commissionDetails.push({
          level: 1,
          userId: level1User._id,
          name: level1User.name,
          phone: level1User.phone,
          commission: level1Commission,
          percentage: 10
        });
        
        console.log(`Level 1 Commission: ${level1Commission} to ${level1User.name}`);
        
        // Level 2: 5% (উপরের রেফারের উপরের রেফার)
        if (level1User.referredBy) {
          const level2User = await User.findOne({ refCode: level1User.referredBy });
          if (level2User && !level2User.isBlocked) {
            const level2Commission = depositAmount * 0.05; // 5%
            level2User.balance += level2Commission;
            await level2User.save();
            
            commissionDetails.push({
              level: 2,
              userId: level2User._id,
              name: level2User.name,
              phone: level2User.phone,
              commission: level2Commission,
              percentage: 5
            });
            
            console.log(`Level 2 Commission: ${level2Commission} to ${level2User.name}`);
            
            // Level 3: 2% (উপরের রেফারের উপরের রেফার)
            if (level2User.referredBy) {
              const level3User = await User.findOne({ refCode: level2User.referredBy });
              if (level3User && !level3User.isBlocked) {
                const level3Commission = depositAmount * 0.02; // 2%
                level3User.balance += level3Commission;
                await level3User.save();
                
                commissionDetails.push({
                  level: 3,
                  userId: level3User._id,
                  name: level3User.name,
                  phone: level3User.phone,
                  commission: level3Commission,
                  percentage: 2
                });
                
                console.log(`Level 3 Commission: ${level3Commission} to ${level3User.name}`);
              }
            }
          }
        }
      }
    }
    
    return {
      level1: commissionDetails.some(d => d.level === 1),
      level2: commissionDetails.some(d => d.level === 2),
      level3: commissionDetails.some(d => d.level === 3),
      details: commissionDetails,
      totalCommission: commissionDetails.reduce((sum, d) => sum + d.commission, 0)
    };
    
  } catch (error) {
    console.error("Error distributing referral commission:", error);
    return { level1: false, level2: false, level3: false, details: [], totalCommission: 0 };
  }
};

// ==================== CREATE TRANSACTION ====================
router.post("/create", async (req, res) => {
  try {
    const {
      userId,
      amount,
      transactionId,
      paymentMethod,
      phoneNumber,
    } = req.body;

    // Validation
    if (!userId || !amount || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "সব তথ্য দিন",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ইউজার পাওয়া যায়নি",
      });
    }

    // Duplicate check
    const exist = await Transaction.findOne({ transactionId });
    if (exist) {
      return res.status(400).json({
        success: false,
        message: "এই ট্রানজেকশন আইডি আগে ব্যবহার হয়েছে",
      });
    }

    const newTransaction = new Transaction({
      userId,
      amount,
      transactionId,
      paymentMethod,
      phoneNumber,
      status: "pending",
      userName: user.name,
      userPhone: user.phone
    });

    await newTransaction.save();

    res.json({
      success: true,
      message: "ট্রানজেকশন সাবমিট করা হয়েছে",
      transaction: newTransaction,
    });
  } catch (err) {
    console.error("Create transaction error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "সার্ভার সমস্যা হয়েছে" 
    });
  }
});

// ==================== GET ALL TRANSACTIONS (Admin) ====================
router.get("/all", async (req, res) => {
  try {
    const list = await Transaction.find()
      .populate("userId", "name phone email refCode")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      transactions: list,
      count: list.length
    });
  } catch (err) {
    console.error("Get all transactions error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Error" 
    });
  }
});

// ==================== GET USER TRANSACTIONS ====================
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID required" 
      });
    }

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalDeposit = transactions
      .filter(t => t.status === "approved")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingDeposit = transactions
      .filter(t => t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      transactions: transactions,
      count: transactions.length,
      stats: {
        totalDeposit,
        pendingDeposit,
        approvedCount: transactions.filter(t => t.status === "approved").length,
        pendingCount: transactions.filter(t => t.status === "pending").length,
        rejectedCount: transactions.filter(t => t.status === "rejected").length
      }
    });
  } catch (err) {
    console.error("Get user transactions error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "সার্ভার সমস্যা হয়েছে" 
    });
  }
});

// ==================== GET SINGLE TRANSACTION DETAILS ====================
router.get("/details/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("userId", "name phone email refCode balance");

    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: "Transaction not found" 
      });
    }

    // Get referral tree info if exists
    let referralInfo = null;
    if (transaction.userId && transaction.userId.referredBy) {
      const referrer = await User.findOne({ refCode: transaction.userId.referredBy });
      if (referrer) {
        referralInfo = {
          referrer: {
            name: referrer.name,
            phone: referrer.phone,
            refCode: referrer.refCode
          }
        };
        
        // Get level 2 referrer
        if (referrer.referredBy) {
          const level2Referrer = await User.findOne({ refCode: referrer.referredBy });
          if (level2Referrer) {
            referralInfo.level2 = {
              name: level2Referrer.name,
              phone: level2Referrer.phone,
              refCode: level2Referrer.refCode
            };
          }
        }
      }
    }

    res.json({
      success: true,
      transaction: transaction,
      referralInfo: referralInfo,
      commissionAmount: transaction.amount * 0.10 // 10% commission for referrer
    });
  } catch (err) {
    console.error("Get transaction details error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "সার্ভার সমস্যা হয়েছে" 
    });
  }
});

// ==================== APPROVE TRANSACTION (WITH REFERRAL COMMISSION) ====================
// transactionRoutes.js - আপডেটেড approve রাউট
router.patch("/approve/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body; // ✅ এডমিন আইডি নেওয়া হচ্ছে
    
    const trx = await Transaction.findById(id);

    if (!trx) {
      return res.status(404).json({ 
        success: false,
        message: "Transaction not found" 
      });
    }

    if (trx.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "এই ট্রানজেকশন ইতিমধ্যে প্রসেস করা হয়েছে",
      });
    }

    // Get user
    const user = await User.findById(trx.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Add deposit amount to user balance
    user.balance += trx.amount;
    await user.save();

    // Distribute referral commission (10%, 5%, 2%)
    const commissionResult = await distributeReferralCommission(trx.userId, trx.amount);

    // Update transaction status
    trx.status = "approved";
    trx.approvedAt = new Date();
    trx.approvedBy = adminId || "admin"; // ✅ এডমিন আইডি সেভ হচ্ছে
    trx.commissionDistributed = commissionResult.totalCommission > 0;
    await trx.save();

    res.json({
      success: true,
      message: "ট্রানজেকশন অনুমোদন করা হয়েছে",
      newBalance: user.balance,
      commissionGiven: commissionResult,
      depositAmount: trx.amount
    });
    
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Server error" 
    });
  }
});

// ==================== REJECT TRANSACTION ====================
router.patch("/reject/:id", async (req, res) => {
  try {
    const trx = await Transaction.findById(req.params.id);

    if (!trx) {
      return res.status(404).json({ 
        success: false,
        message: "Transaction not found" 
      });
    }

    if (trx.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "এই ট্রানজেকশন ইতিমধ্যে প্রসেস করা হয়েছে",
      });
    }

    trx.status = "rejected";
    trx.rejectedAt = new Date();
    await trx.save();

    res.json({
      success: true,
      message: "ট্রানজেকশন বাতিল করা হয়েছে",
    });
  } catch (err) {
    console.error("Reject transaction error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Error" 
    });
  }
});

// ==================== ADMIN STATISTICS ====================
router.get("/admin/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isBlocked: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    const totalDeposit = await Transaction.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const pendingDeposit = await Transaction.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const monthlyDeposit = await Transaction.aggregate([
      { 
        $match: { 
          status: "approved",
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: blockedUsers
        },
        transactions: {
          totalDeposit: totalDeposit[0]?.total || 0,
          pendingDeposit: pendingDeposit[0]?.total || 0,
          monthlyDeposit: monthlyDeposit[0]?.total || 0
        }
      }
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Error" 
    });
  }
});

// ==================== DELETE TRANSACTION (Admin only) ====================
router.delete("/admin/delete/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: "Transaction not found" 
      });
    }

    // If transaction was approved, deduct amount from user balance
    if (transaction.status === "approved") {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance -= transaction.amount;
        await user.save();
      }
    }

    await Transaction.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "ট্রানজেকশন ডিলিট করা হয়েছে"
    });
  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Error" 
    });
  }
});

// ==================== GET PENDING TRANSACTIONS COUNT ====================
router.get("/pending/count", async (req, res) => {
  try {
    const count = await Transaction.countDocuments({ status: "pending" });
    res.json({
      success: true,
      pendingCount: count
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

module.exports = router;