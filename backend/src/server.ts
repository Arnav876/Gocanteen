import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { ENV } from './config/env';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
export const io = new SocketIOServer(server, {
  cors: {
    origin: ENV.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join canteen room (for provider KDS)
  socket.on('join:canteen', (canteenId: string) => {
    socket.join(`canteen:${canteenId}`);
    console.log(`[Socket.IO] ${socket.id} joined canteen:${canteenId}`);
  });

  // Join private order room (for customer order status updates)
  socket.on('join:order', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`[Socket.IO] ${socket.id} joined order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

server.listen(ENV.PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 CampusBites API Server running on port ${ENV.PORT}`);
  console.log(`📡 Socket.IO Real-Time Gateway ready`);
  console.log(`🌱 Environment: ${ENV.NODE_ENV}`);
  console.log(`===============================================`);
});
