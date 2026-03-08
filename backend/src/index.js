require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const db = require('./models/db');
const { isDbConnectionError } = require('./utils/db-fallback');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const electricityRoutes = require('./routes/electricity.routes');
const waterRoutes = require('./routes/water.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const productionRoutes = require('./routes/production.routes');
const reportRoutes = require('./routes/report.routes');
const assetRoutes = require('./routes/asset.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/electricity', electricityRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  if (isDbConnectionError(err)) {
    return res.status(503).json({
      error: 'Database unavailable. Start SQL Server on localhost:1433 or update backend/.env.'
    });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.query('SELECT 1');
    logger.info('Database connected successfully');
    
    app.listen(PORT, () => {
      logger.info(`FUPMS Backend running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to connect to database:', error.message);
    logger.info('Starting server without database connection...');
    app.listen(PORT, () => {
      logger.info(`FUPMS Backend running on port ${PORT} (no DB)`);
    });
  }
}

startServer();

module.exports = app;
