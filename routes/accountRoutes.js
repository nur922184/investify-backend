// routes/accountRoutes.js
const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const User = require('../models/User');

// ➕ Add Account
router.post('/add', async (req, res) => {
  try {
    const { userId, accountType, accountName, accountNumber, holderName } = req.body;

    if (!userId || !accountType || !accountName || !accountNumber || !holderName) {
      return res.status(400).json({ success: false, message: 'সব তথ্য প্রয়োজন' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি' });
    }

    // 🔒 Global duplicate check
    const existingAccount = await Account.findOne({ accountNumber });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'এই নম্বর ইতিমধ্যে ব্যবহার করা হয়েছে'
      });
    }

    const newAccount = new Account({
      userId,
      accountType,
      accountName,
      accountNumber,
      holderName
    });

    await newAccount.save();

    const count = await Account.countDocuments({ userId });
    if (count === 1) {
      newAccount.isDefault = true;
      await newAccount.save();
    }

    res.status(201).json({
      success: true,
      message: 'অ্যাকাউন্ট সফলভাবে যোগ হয়েছে',
      account: newAccount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'সার্ভার সমস্যা হয়েছে' });
  }
});

// 📄 Get Accounts
router.get('/user/:userId', async (req, res) => {
  try {
    const accounts = await Account.find({
      userId: req.params.userId,
      isActive: true
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({ success: true, accounts });
  } catch {
    res.status(500).json({ success: false, message: 'অ্যাকাউন্ট পাওয়া যায়নি' });
  }
});

// ✏️ Update
router.put('/update/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { accountName, holderName, accountNumber } = req.body;

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'অ্যাকাউন্ট পাওয়া যায়নি' });
    }

    // duplicate check
    if (accountNumber) {
      const exists = await Account.findOne({
        accountNumber,
        _id: { $ne: accountId }
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'এই নম্বর অন্য অ্যাকাউন্টে ব্যবহার হয়েছে'
        });
      }
      account.accountNumber = accountNumber;
    }

    if (accountName) account.accountName = accountName;
    if (holderName) account.holderName = holderName;

    await account.save();

    res.json({ success: true, message: 'আপডেট সফল', account });
  } catch {
    res.status(500).json({ success: false, message: 'আপডেট ব্যর্থ' });
  }
});

// ❌ Delete (soft)
router.delete('/delete/:accountId', async (req, res) => {
  try {
    const account = await Account.findById(req.params.accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'অ্যাকাউন্ট নেই' });
    }

    account.isActive = false;
    await account.save();

    // 🔄 reset default if needed
    if (account.isDefault) {
      const next = await Account.findOne({ userId: account.userId, isActive: true });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    res.json({ success: true, message: 'ডিলিট হয়েছে' });
  } catch {
    res.status(500).json({ success: false, message: 'ডিলিট ব্যর্থ' });
  }
});

// ⭐ Set Default
router.put('/set-default/:accountId', async (req, res) => {
  try {
    const { userId } = req.body;

    await Account.updateMany({ userId }, { isDefault: false });

    const account = await Account.findById(req.params.accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'অ্যাকাউন্ট নেই' });
    }

    account.isDefault = true;
    await account.save();

    res.json({ success: true, message: 'ডিফল্ট সেট হয়েছে' });
  } catch {
    res.status(500).json({ success: false, message: 'ব্যর্থ' });
  }
});

module.exports = router;