const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// 👉 REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, referredBy } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "সব ফিল্ড পূরণ করুন" });
    }

    // ✅ Phone validation
    const phoneRegex = /^(01[3-9]\d{8}|\+8801[3-9]\d{8})$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "সঠিক ফোন নম্বর দিন" });
    }

    // ✅ Duplicate check
    const exist = await User.findOne({ phone });
    if (exist) {
      return res.status(400).json({ message: "এই নাম্বার আগে থেকেই আছে" });
    }

    // ✅ Referral validation (IMPORTANT)
    if (referredBy) {
      const refUser = await User.findOne({ refCode: referredBy });
      if (!refUser) {
        return res.status(400).json({ message: "অবৈধ রেফারেল কোড!" });
      }
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Use frontend refCode or generate
    const myRefCode =
      req.body.refCode ||
      "REF" + Math.floor(100000 + Math.random() * 900000);

    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      refCode: myRefCode,
      referredBy: referredBy || null,
      balance: 50, // always backend controlled
    });

    await newUser.save();

    res.status(201).json({
      message: "Account created 🎉 ৳50 bonus added",
      user: newUser,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


// 👉 LOGIN (NO JWT)
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "ফোন এবং পাসওয়ার্ড দিন" });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({ message: "ইউজার পাওয়া যায়নি" });
    }

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "ভুল পাসওয়ার্ড" });
    }

    res.json({
      message: "লগইন সফল হয়েছে! 🎉",
      user,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/change-password", async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "সব তথ্য দিন"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ইউজার পাওয়া যায়নি"
      });
    }

    // 🔑 Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "পুরাতন পাসওয়ার্ড ভুল"
      });
    }

    // 🔒 Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({
      success: true,
      message: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "সার্ভার সমস্যা হয়েছে"
    });
  }
});


router.put("/admin/block-user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ইউজার পাওয়া যায়নি"
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: user.isBlocked ? "ইউজার ব্লক করা হয়েছে" : "ইউজার আনব্লক করা হয়েছে"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "অপারেশন ব্যর্থ"
    });
  }
});

router.delete("/admin/delete-user/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ইউজার পাওয়া যায়নি"
      });
    }

    res.json({
      success: true,
      message: "ইউজার ডিলিট করা হয়েছে"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "ডিলিট ব্যর্থ"
    });
  }
});

router.get("/admin/dashboard", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const activeUsers = await User.countDocuments({ isBlocked: false });

    res.json({
      success: true,
      data: {
        totalUsers,
        blockedUsers,
        activeUsers
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ড্যাশবোর্ড লোড ব্যর্থ"
    });
  }
});


// 👉 ALL USERS
router.get("/all", async (req, res) => {
  try {
    const users = await User.find().sort({ _id: -1 });

    res.json({
      total: users.length,
      users,
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;