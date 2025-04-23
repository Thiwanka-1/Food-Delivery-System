import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import orderRoutes from "./routes/order.routes.js";

dotenv.config();


// Initialize the Express app
const app = express();

// Middleware
app.use(express.json());  // Parses incoming requests with JSON payloads
app.use(cookieParser());   // Parse cookies in incoming requests
app.use(cors()); // Allow all origins (can be configured later)


// MongoDB connection using Mongoose directly
mongoose.connect(process.env.MONGO_ORD, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to Order MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit the process if MongoDB connection fails
});

// Routes
app.use("/api/orders", orderRoutes);




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

// Start the server
const PORT = process.env.PORT || 3002; // Use PORT from .env or default to 3000
app.listen(PORT, () => {
  console.log(`Order Server running on port ${PORT}`);
});

export default app; // Export the app for testing
