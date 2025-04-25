import express from "express";
import { createOrder, updateOrder, updateOrderStatus, getOrderById, getOrdersByUser, cancelOrder } from "../controllers/order.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// Create a new order (protected route)
router.post("/add", verifyToken, createOrder);

// Update order details (if modifications are allowed)
router.put("/update/:id", verifyToken, updateOrder);
// Retrieve order details by order ID (for tracking)
router.get("/get/:id", getOrderById);

// Retrieve all orders for the authenticated user
router.get("/user/:userId", verifyToken, getOrdersByUser);

// Update order status (for restaurant acceptance, driver assignment, etc.)
router.patch("/:id/status", verifyToken, updateOrderStatus);

router.patch("/:id/cancel", cancelOrder);


export default router;
