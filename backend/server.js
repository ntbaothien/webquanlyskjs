import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startReminderScheduler } from './utils/reminderService.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import organizerRoutes from './routes/organizerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import userRoutes from './routes/userRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import pollRoutes from './routes/pollRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import resellRoutes from './routes/resellRoutes.js';
import groupBuyRoutes from './routes/groupBuyRoutes.js';
import ChatMessage from './models/ChatMessage.js';
import { getBotReply } from './utils/aiBot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible in routes
app.set('io', io);

// Connect MongoDB
connectDB();

// Start Event Reminder Scheduler
startReminderScheduler();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files — uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api', ticketRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/marketplace', resellRoutes);
app.use('/api/group-buy', groupBuyRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined room`);
  });

  socket.on('chat:join', ({ userId, userName }) => {
    // Each user joins their own private room
    const userRoom = `chat:user:${userId}`;
    socket.join(userRoom);
    // Store userId on socket for later reference
    socket.data.userId = userId;
    socket.data.userName = userName;
    console.log(`💬 ${userName} joined private room ${userRoom}`);
  });

  socket.on('chat:message', async ({ userId, userName, userRole, message }) => {
    try {
      const userRoom = `chat:user:${userId}`;

      // Save user message with user-specific roomId
      const userMsg = await ChatMessage.create({
        roomId: `user:${userId}`,
        senderId: userId,
        senderName: userName,
        senderRole: userRole || 'ATTENDEE',
        message,
        isBot: false
      });

      // Send user message back only to this user's private room
      io.to(userRoom).emit('chat:message', userMsg.toObject());

      // Generate AI bot reply after short delay
      setTimeout(async () => {
        try {
          const replyText = await getBotReply(message);
          const botMsg = await ChatMessage.create({
            roomId: `user:${userId}`,
            senderId: 'bot',
            senderName: 'EventHub Bot',
            senderRole: 'BOT',
            message: replyText,
            isBot: true
          });
          // Send bot reply only to this user's private room
          io.to(userRoom).emit('chat:message', botMsg.toObject());
        } catch (err) {
          console.error('Bot reply error:', err);
        }
      }, 1200);
    } catch (err) {
      console.error('Chat message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 EventHub Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});

export { io };
