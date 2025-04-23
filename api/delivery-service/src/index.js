import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import driverRoutes from "./routes/driver.routes.js";

// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// MongoDB connection using Mongoose directly
mongoose.connect(process.env.MONGO_DELIVERY, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use("/api/drivers", driverRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Adjust CORS settings as needed
});

// When a client connects, log the connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  // Optional: Listen for events from clients (e.g., driver join rooms, etc.)
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Expose the Socket.IO instance to the controllers via app locals
app.locals.io = io;

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`Delivery Service running on port ${PORT}`);
});

export default app;
