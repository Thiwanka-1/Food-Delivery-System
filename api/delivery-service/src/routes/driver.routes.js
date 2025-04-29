import express from 'express';
import { createDriver, updateDriverLocation, getDriverById, assignDriverToOrder,updateDriverAvailability, confirmPickup, confirmDelivery, getDriverByUserId  } from '../controllers/driver.controller.js';
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// Create a new driver record
router.post("/add", createDriver);

router.post("/assign", verifyToken, assignDriverToOrder);

router.patch("/confirm-pickup", verifyToken, confirmPickup);
// New endpoint for confirming delivery
router.patch("/confirm-delivery", verifyToken, confirmDelivery);
// Update driver location
router.put("/:id/location", updateDriverLocation);
// New endpoint for updating availability
router.patch("/:id/availability", verifyToken, updateDriverAvailability);

// Get driver details by ID
router.get("/get/:id", getDriverById);
router.get("/user/:userId", getDriverByUserId);



export default router;
