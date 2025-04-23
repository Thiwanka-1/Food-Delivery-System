import express from "express";
import { createPayment, getPaymentByOrder, stripeWebhook } from "../controllers/payment.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// Kick off a payment (frontend will use clientSecret to confirm)
router.post("/create", createPayment);

// Query payment status by order ID
router.get("/order/:orderId", getPaymentByOrder);

// Stripe webhook (no auth)

export default router;
