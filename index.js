const express = require('express');
const cors = require('cors');
require('dotenv').config();

const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// ================= DATABASE CONNECT =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // ================= ROUTES =================
    const userRoutes = require("./routes/userRoutes");
    const productRoutes = require("./routes/productRoutes");
    const investmentRoutes = require("./routes/investmentRoutes");
    const bonusRoutes = require("./routes/bonusRoutes");
    const transactionRoutes = require("./routes/transactionRoutes");
    const accountRoutes = require("./routes/accountRoutes");
    const withdrawalRoutes = require("./routes/withdrawalRoutes");
    const authRoutes = require("./routes/authRoutes");
    const CodebonusRoutes = require("./routes/CodebonusRoutes");

    app.use("/api/users", userRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/investments", investmentRoutes);
    app.use("/api/bonus", bonusRoutes);
    app.use("/api/transactions", transactionRoutes);
    app.use("/api/accounts", accountRoutes);
    app.use("/api/withdrawals", withdrawalRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/bonus-code", CodebonusRoutes);

    // test route
    app.get('/', (req, res) => {
      res.send('🚀 Server is running');
    });

    // START SERVER AFTER DB CONNECT
    app.listen(port, () => {
      console.log(`🚀 Server running on port: ${port}`);
    });

  })
  .catch(err => {
    console.log("❌ DB connection error:", err);
  });