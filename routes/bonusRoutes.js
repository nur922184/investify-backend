const express = require("express");
const router = express.Router();
const Bonus = require("../models/Bonus");

router.get("/status/:userId", async (req, res) => {
  const bonus = await Bonus.findOne({ userId: req.params.userId });
  res.json({ claimed: bonus?.claimed || false });
});

// bonusRoutes.js - লেভেল বোনাস ক্লেইম এন্ডপয়েন্ট
router.post("/level-claim", async (req, res) => {
  try {
    const { userId, level, amount } = req.body;
    
    if (!userId || !level || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: "সব তথ্য প্রয়োজন" 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "ইউজার পাওয়া যায়নি" 
      });
    }
    
    // চেক করা বোনাস আগে নেওয়া হয়েছে কিনা
    const claimedKey = `level_bonus_${level}_${userId}`;
    const alreadyClaimed = await BonusClaim.findOne({ userId, level });
    
    if (alreadyClaimed) {
      return res.status(400).json({ 
        success: false, 
        message: "এই লেভেলের বোনাস ইতিমধ্যে ক্লেইম করা হয়েছে" 
      });
    }
    
    // বোনাস যোগ করা
    user.balance += amount;
    await user.save();
    
    // বোনাস ক্লেইম রেকর্ড
    await BonusClaim.create({
      userId,
      level,
      amount,
      claimedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Level ${level} বোনাস ক্লেইম সফল!`,
      newBalance: user.balance
    });
    
  } catch (error) {
    console.error("Level claim error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.post("/claim", async (req, res) => {
  const { userId } = req.body;

  let bonus = await Bonus.findOne({ userId });

  if (bonus && bonus.claimed) {
    return res.status(400).json({ message: "Already claimed" });
  }

  if (!bonus) {
    bonus = new Bonus({ userId, claimed: true });
  } else {
    bonus.claimed = true;
  }

  await bonus.save();

  res.json({ success: true });
});

module.exports = router;