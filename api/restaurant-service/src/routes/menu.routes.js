// backend/restaurant-service/src/routes/menu.routes.js
import express from "express";
import { 
  addMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  getMenuByRestaurant 
} from "../controllers/menu.controller.js";
import { verifyToken } from '../utils/verifyUser.js';
import upload from "../utils/upload.js";

const router = express.Router();

// Public route: List all menu items for a restaurant
router.get("/restaurant/:restaurantId", getMenuByRestaurant);

// Protected routes for restaurant owners
router.post("/restaurant/:restaurantId", verifyToken, upload.single("image"), addMenuItem);
router.put("/update/:id", verifyToken, upload.single("image"), updateMenuItem);
router.delete("/delete/:id", verifyToken, deleteMenuItem);

export default router;
