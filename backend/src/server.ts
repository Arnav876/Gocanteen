import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { ENV } from './config/env';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
export const io = new SocketIOServer(server, {
  cors: {
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join provider room (for provider incoming orders/updates)
  socket.on('join:provider', (providerId: string) => {
    socket.join(`provider:${providerId}`);
    console.log(`[Socket.IO] ${socket.id} joined provider:${providerId}`);
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
  console.log(`🚀 Gocanteen / CampusBites API Server running on port ${ENV.PORT}`);
  console.log(`📡 Socket.IO Real-Time Gateway ready`);
  console.log(`🌱 Environment: ${ENV.NODE_ENV}`);
  console.log(`===============================================`);
});
