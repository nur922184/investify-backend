// routes/bonusRoutes.js
const express = require("express");
const router = express.Router();
const BonusCode = require("../models/BonusCode");
const User = require("../models/User");

// ==================== GENERATE BONUS CODE (ADMIN) ====================
router.post("/admin/generate", async (req, res) => {
  try {
    const { adminId, amount, maxUses } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ success: false, message: "এডমিন আইডি প্রয়োজন" });
    }
    
    // Generate random code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    let code = generateCode();
    let existing = await BonusCode.findOne({ code });
    
    // Ensure unique code
    while (existing) {
      code = generateCode();
      existing = await BonusCode.findOne({ code });
    }
    
    const bonusCode = new BonusCode({
      code,
      amount: amount || 50,
      createdBy: adminId,
      maxUses: maxUses || 100,
      isActive: true
    });
    
    await bonusCode.save();
    
    res.json({
      success: true,
      message: "বোনাস কোড তৈরি করা হয়েছে",
      data: bonusCode
    });
    
  } catch (error) {
    console.error("Error generating code:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET ALL ACTIVE BONUS CODES (ADMIN) ====================
router.get("/admin/all", async (req, res) => {
  try {
    const codes = await BonusCode.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: codes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DELETE BONUS CODE (ADMIN) ====================
router.delete("/admin/delete/:id", async (req, res) => {
  try {
    await BonusCode.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "বোনাস কোড ডিলিট করা হয়েছে" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}); 

// ==================== TOGGLE BONUS CODE STATUS (ADMIN) ====================
router.put("/admin/toggle/:id", async (req, res) => {
  try {
    const bonusCode = await BonusCode.findById(req.params.id);
    if (!bonusCode) {
      return res.status(404).json({ success: false, message: "কোড পাওয়া যায়নি" });
    }
    
    bonusCode.isActive = !bonusCode.isActive;
    await bonusCode.save();
    
    res.json({
      success: true,
      message: `কোড ${bonusCode.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CLAIM BONUS (USER) ====================
router.post("/claim", async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ success: false, message: "সব তথ্য দিন" });
    }
    
    // Find the bonus code
    const bonusCode = await BonusCode.findOne({ code: code.toUpperCase() });
    
    if (!bonusCode) {
      return res.status(404).json({ success: false, message: "ভুল বোনাস কোড" });
    }
    
    // Check if code is active
    if (!bonusCode.isActive) {
      return res.status(400).json({ success: false, message: "এই বোনাস কোডটি নিষ্ক্রিয়" });
    }
    
    // Check if expired
    if (new Date() > bonusCode.expiresAt) {
      return res.status(400).json({ success: false, message: "বোনাস কোডের মেয়াদ শেষ হয়ে গেছে" });
    }
    
    // Check if user already used this code
    const alreadyUsed = bonusCode.usedBy.some(use => use.userId.toString() === userId);
    if (alreadyUsed) {
      return res.status(400).json({ success: false, message: "আপনি ইতিমধ্যে এই কোড ব্যবহার করেছেন" });
    }
    
    // Check max uses
    if (bonusCode.usedCount >= bonusCode.maxUses) {
      return res.status(400).json({ success: false, message: "বোনাস কোডটি সর্বোচ্চ ব্যবহার হয়ে গেছে" });
    }
    
    // Add user to usedBy
    bonusCode.usedBy.push({ userId, usedAt: new Date() });
    bonusCode.usedCount += 1;
    await bonusCode.save();
    
    // Add bonus to user balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "ইউজার পাওয়া যায়নি" });
    }
    
    user.balance += bonusCode.amount;
    await user.save();
    
    res.json({
      success: true,
      message: `অভিনন্দন! ৳${bonusCode.amount} বোনাস আপনার অ্যাকাউন্টে যোগ করা হয়েছে`,
      newBalance: user.balance,
      bonusAmount: bonusCode.amount
    });
    
  } catch (error) {
    console.error("Error claiming bonus:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CHECK BONUS CODE VALIDITY ====================
router.post("/check", async (req, res) => {
  try {
    const { code } = req.body;
    
    const bonusCode = await BonusCode.findOne({ code: code.toUpperCase() });
    
    if (!bonusCode) {
      return res.json({ success: false, valid: false, message: "ভুল বোনাস কোড" });
    }
    
    if (!bonusCode.isActive) {
      return res.json({ success: false, valid: false, message: "কোডটি নিষ্ক্রিয়" });
    }
    
    if (new Date() > bonusCode.expiresAt) {
      return res.json({ success: false, valid: false, message: "কোডের মেয়াদ শেষ" });
    }
    
    if (bonusCode.usedCount >= bonusCode.maxUses) {
      return res.json({ success: false, valid: false, message: "কোডটি ব্যবহারের সীমা পূর্ণ" });
    }
    
    res.json({
      success: true,
      valid: true,
      amount: bonusCode.amount,
      message: `ভ্যালিড কোড! আপনি ৳${bonusCode.amount} বোনাস পাবেন`
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;