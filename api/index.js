require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', service: 'carenearby-api', db: dbState });
});

const authRoutes = require('../src/routes/auth');
const customerRoutes = require('../src/routes/customer');
const pswRoutes = require('../src/routes/psw');
const adminRoutes = require('../src/routes/admin');
const adminAuthRoutes = require('../src/routes/adminAuth');
const documentRoutes = require('../src/routes/documents');

app.use('/auth', authRoutes);
app.use('/jobs', pswRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', adminAuthRoutes);
app.use('/documents', documentRoutes);
app.use('/', customerRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

async function connectDB() {
  if (!isConnected && MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB error:', err.message);
    }
  }
  return isConnected;
}

const mongooseConnection = mongoose.connection;
mongooseConnection.on('error', (err) => {
  console.error('Mongoose error:', err);
});

module.exports = async (req, res) => {
  await connectDB();
  app(req, res);
};
