// src/index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import driverRoutes from "./routes/driver.routes.js";

dotenv.config();
const app = express();

// ── Middleware ─────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// ── MongoDB Connection ─────────────────────────
mongoose.connect(process.env.MONGO_DELIVERY, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// ── Routes ─────────────────────────────────────
app.use("/api/drivers", driverRoutes);

// ── Error Handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── HTTP + Socket.IO Setup ─────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// make io available in controllers
app.locals.io = io;

// ── Start Server ───────────────────────────────
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`Delivery Service running on port ${PORT}`);
});
