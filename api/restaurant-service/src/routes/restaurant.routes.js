// backend/restaurant-service/src/routes/restaurant.routes.js
import express from "express";
import { 
  createRestaurant, 
  getAllRestaurants, 
  getRestaurantById, 
  updateRestaurant, 
  deleteRestaurant, 
  toggleAvailability,
  decideOrder, 
  markOrderReady
} from "../controllers/restaurant.controller.js";
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

// Protected routes for restaurant owners
router.post("/add", verifyToken, createRestaurant);
router.post("/orders/decision", verifyToken, decideOrder);

router.put("/update/:id", verifyToken, updateRestaurant);
router.delete("/delete/:id", verifyToken, deleteRestaurant);
router.patch("/:id/availability", verifyToken, toggleAvailability);

// Public routes
router.get("/getall", getAllRestaurants);
router.get("/getid/:id", getRestaurantById);

// New: mark an order ready
router.patch("/orders/:orderId/ready",verifyToken,markOrderReady);


export default router;
