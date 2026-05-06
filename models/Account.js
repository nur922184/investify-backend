// models/Account.js
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    accountType: {
      type: String,
      enum: ['bkash', 'nagad'],
      required: true
    },

    accountName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },

    accountNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^01[3-9]\d{8}$/, 'সঠিক নম্বর দিন (01XXXXXXXXX)']
    },

    holderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true // 🔥 createdAt + updatedAt auto
  }
);


// ✅ SAME USER + SAME NUMBER duplicate prevent
accountSchema.index(
  { userId: 1, accountNumber: 1 },
  { unique: true }
);


// ✅ ONLY ONE default account per user
accountSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true }
  }
);


// 🔥 CLEAN NUMBER (NO SPACE)
accountSchema.pre('save', function () {
  if (this.accountNumber) {
    this.accountNumber = this.accountNumber.replace(/\s+/g, '');
  }
});


// 🔥 GLOBAL ERROR HANDLE HELPER (optional use)
accountSchema.post('save', function (error, doc, next) {
  if (error.code === 11000) {
    return next(new Error('এই নম্বর ইতিমধ্যে ব্যবহার হয়েছে'));
  }
  next(error);
});


module.exports = mongoose.model('Account', accountSchema);