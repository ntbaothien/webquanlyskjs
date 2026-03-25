require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./src/config/db');
const config = require('./src/config/env');

const server = http.createServer(app);

// ===== Socket.IO setup (sẽ mở rộng sau) =====
// const { Server } = require('socket.io');
// const io = new Server(server, {
//   cors: { origin: config.clientUrl, credentials: true }
// });
// require('./src/services/socket.service')(io);

const PORT = config.port || 5000;

const startServer = async () => {
  try {
    // Kết nối MongoDB Atlas
    await connectDB();

    server.listen(PORT, () => {
      console.log('');
      console.log('🎟️  ================================');
      console.log(`🚀  EventHub Server running on port ${PORT}`);
      console.log(`🌍  Environment: ${config.nodeEnv}`);
      console.log(`📡  API: http://localhost:${PORT}/api`);
      console.log(`❤️   Health: http://localhost:${PORT}/health`);
      console.log('🎟️  ================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 SIGINT received. Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
