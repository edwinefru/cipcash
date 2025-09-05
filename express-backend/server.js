const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.EXPRESS_PORT || 8002;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
    },
  },
}));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CipCash Express Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Real-time features
const activeConnections = new Map();
const transactionUpdates = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('authenticate', (data) => {
    const { userId, authToken } = data;
    if (userId && authToken) {
      activeConnections.set(userId, socket.id);
      socket.userId = userId;
      socket.join(`user_${userId}`);
      console.log(`User ${userId} authenticated and joined room`);
    }
  });

  socket.on('subscribe_transaction', (transactionId) => {
    socket.join(`transaction_${transactionId}`);
    console.log(`User ${socket.userId} subscribed to transaction ${transactionId}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      activeConnections.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

// Real-time notification system
const notifyUser = (userId, notification) => {
  const socketId = activeConnections.get(userId);
  if (socketId) {
    io.to(`user_${userId}`).emit('notification', notification);
  }
};

const updateTransactionStatus = (transactionId, status, data = {}) => {
  io.to(`transaction_${transactionId}`).emit('transaction_update', {
    transactionId,
    status,
    timestamp: new Date().toISOString(),
    ...data
  });
};

// CipCash API Routes
app.use('/api/realtime', require('./routes/realtime'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/chat', require('./routes/chat'));

// Make Socket.IO available to routes
app.set('io', io);

// Proxy FastAPI requests
app.use('/api/v1', createProxyMiddleware({
  target: FASTAPI_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1': '/api'
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'FastAPI backend is not responding'
    });
  }
}));

// CipCash Admin Dashboard Enhanced Routes
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/admin/dashboard.html');
});

app.get('/admin/analytics', (req, res) => {
  res.sendFile(__dirname + '/public/admin/analytics.html');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down CipCash Express server...');
  server.close(() => {
    console.log('Server shut down successfully');
    process.exit(0);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CipCash Express Backend running on port ${PORT}`);
  console.log(`📊 Real-time features enabled`);
  console.log(`🔗 Proxying FastAPI requests from ${FASTAPI_URL}`);
});

// Export for testing
module.exports = { app, server, io, notifyUser, updateTransactionStatus };