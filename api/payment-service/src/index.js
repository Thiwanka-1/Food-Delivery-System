import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import paymentRoutes from "./routes/payment.routes.js";
import { stripeWebhook } from "./controllers/payment.controller.js";

// Load environment variables
dotenv.config();

const app = express();

// 1) Stripe webhook endpoint (raw body) must come before express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// 2) Then JSON parsing and cookie middleware for all other routes
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_PAYMENT, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Payment DB connected"))
.catch(err => {
  console.error("Payment DB error:", err);
  process.exit(1);
});

// Mount the payment-related routes
app.use("/api/payments", paymentRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
});

// Start the server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));

export default app; // Export for testing
