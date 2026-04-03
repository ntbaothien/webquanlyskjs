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
    socket.join('chat:support');
    console.log(`💬 ${userName} joined support chat`);
  });

  socket.on('chat:message', async ({ userId, userName, userRole, message }) => {
    try {
      // Save user message
      const userMsg = await ChatMessage.create({
        roomId: 'support',
        senderId: userId,
        senderName: userName,
        senderRole: userRole || 'ATTENDEE',
        message,
        isBot: false
      });

      // Broadcast user message to all in room
      io.to('chat:support').emit('chat:message', userMsg.toObject());

      // Generate AI bot reply after short delay
      setTimeout(async () => {
        try {
          const replyText = await getBotReply(message);
          const botMsg = await ChatMessage.create({
            roomId: 'support',
            senderId: 'bot',
            senderName: 'EventHub Bot',
            senderRole: 'BOT',
            message: replyText,
            isBot: true
          });
          io.to('chat:support').emit('chat:message', botMsg.toObject());
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
