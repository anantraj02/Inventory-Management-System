const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/error');

// Load environment variables
dotenv.config();

// Database connection and seeding will occur at the bottom of server.js

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser Middleware
app.use(cookieParser());

// Enable CORS with Credentials (for HTTP-only Cookie Refresh Token)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      !process.env.FRONTEND_URL // Fallback: allow all if FRONTEND_URL is not set
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Serve Uploads Statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routers
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/stock-in', require('./routes/stockInRoutes'));
app.use('/api/stock-out', require('./routes/stockOutRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/requisitions', require('./routes/requisitionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));
app.use('/api/closing', require('./routes/closingRoutes'));

// Fallback Route for API
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Enterprise Inventory API Service running...' });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB, Auto Seed, and start listening
connectDB().then(async () => {
  const seedDatabase = require('./utils/seeder');
  await seedDatabase();

  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Rejection Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}).catch(err => {
  console.error('Server failed to start due to database connection error:', err.message);
  process.exit(1);
});
