const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection - Optimized for Serverless
let cachedDb = null;

async function connectDB() {
  if (cachedDb) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = connection;
    console.log("✅ MongoDB Connected Successfully!");
    return connection;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    throw err;
  }
}

// الترحيب في الصفحة الرئيسية
app.get('/', async (req, res) => {
  try {
    await connectDB();
    res.json({ 
      message: "Welcome to my CRUD API! use /api/products to see data.",
      mongoStatus: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: "API is running but DB connection failed",
      error: error.message,
      mongoStatus: 'Disconnected ❌'
    });
  }
});

// Routes
const productRoutes = require('./router/products');
app.use('/api/products', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed: ' + error.message
    });
  }
});
app.use('/api/products', productRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start Server (only for local development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
}

module.exports = app;