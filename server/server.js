import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import { initializeSockets } from './sockets/socketHandler.js';
import { startAutoSubmitJob } from './jobs/autoSubmitJob.js';
import { startHeartbeatJob } from './jobs/heartbeatJob.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import Routes
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exams.js';
import publicRoutes from './routes/public.js';
import attemptRoutes from './routes/attempts.js';
import monitorRoutes from './routes/monitor.js';
import reportRoutes from './routes/reports.js';
import evidenceRoutes from './routes/evidence.js';
import healthRoutes from './routes/health.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows cross-origin streams & web workers
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Limited to CLIENT_URL as mandated in §8
app.use(
  cors({
    origin: CLIENT_URL === '*' ? true : [CLIENT_URL, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser with 1 MB limit (excluding multipart evidence)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sanitize MongoDB operators ($gt, $where, etc.)
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Initialize Realtime Socket.IO and WebRTC Signaling
const io = initializeSockets(server);

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    brand: 'Exam.co',
    tagline: 'Send a link. See every exam.',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Central Error Handler
app.use(errorHandler);

// Connect Database & Launch Server
async function startServer() {
  try {
    await connectDB();

    // Start background cron jobs
    startAutoSubmitJob(15000);
    startHeartbeatJob(10000);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
      ======================================================
      🚀 exam.co Server is running on port ${PORT}
      📡 Socket.IO Real-time Engine initialized
      🛡️  Proctoring & Silent Detection Active
      🔗 Client URL allowed: ${CLIENT_URL}
      ======================================================
      `);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

// Graceful Shutdown handling as mandated in §8
const gracefulShutdown = () => {
  console.log('Received termination signal. Closing HTTP server & socket connections...');
  server.close(() => {
    console.log('exam.co server closed safely.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();

export { app, server, io };
