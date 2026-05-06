const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// middleware
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// ================= ROUTES =================
const userRoutes = require("../routes/userRoutes");
const productRoutes = require("../routes/productRoutes");
const investmentRoutes = require("../routes/investmentRoutes");
const bonusRoutes = require("../routes/bonusRoutes");
const transactionRoutes = require("../routes/transactionRoutes");
const accountRoutes = require("../routes/accountRoutes");
const withdrawalRoutes = require("../routes/withdrawalRoutes");
const authRoutes = require("../routes/authRoutes");
const codeBonusRoutes = require("../routes/CodebonusRoutes");

// ================= USE ROUTES =================
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/bonus", bonusRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bonus-code", codeBonusRoutes);

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
  res.send("🚀 Investify API Running...");
});

// ================= DB CONNECT =================
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = conn.connections[0].readyState === 1;

    console.log("✅ MongoDB Connected");

    const db = mongoose.connection.db;

    await Promise.all([
      db.collection("users").createIndex({ email: 1 }),
      db.collection("users").createIndex({ referralCode: 1 }),
      db.collection("investments").createIndex({ userId: 1 }),
      db.collection("transactions").createIndex({ userId: 1 }),
      db.collection("bonus").createIndex({ userId: 1 }),
      db.collection("accounts").createIndex({ userId: 1 }),
      db.collection("withdrawals").createIndex({ userId: 1 })
    ]);

    console.log("✅ Indexes ensured");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
  }
};

// ================= STARTUP =================
connectDB();

// ================= EXPORT =================
module.exports = app;

// ================= LOCAL SERVER =================
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server running on port ${PORT}`);
  });
}