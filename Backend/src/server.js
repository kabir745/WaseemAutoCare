const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Base Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected,
      name: process.env.DB_NAME || 'wac_db',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      phpmyadmin: 'http://localhost:8081/phpmyadmin/',
    },
  });
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Waseem AutoCare Backend Service',
    status: 'online',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`===============================================`);
  console.log(`  Waseem AutoCare Backend running on port ${PORT}`);
  console.log(`  API Base URL: http://0.0.0.0:${PORT}/api (LAN: http://192.168.1.6:${PORT}/api)`);
  console.log(`  phpMyAdmin: http://localhost:8081/phpmyadmin/`);
  console.log(`===============================================`);
  await testConnection();
});

module.exports = app;
