import express from "express";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackByOrder
} from "../controllers/feedback.controller.js";
import { verifyToken, verifyAdmin } from "../utils/verifyUser.js";

const router = express.Router();

// anyone logged in can create
router.post("/", verifyToken, createFeedback);

// list & detail
router.get("/", verifyToken, getAllFeedback);
router.get("/:id", verifyToken, getFeedbackById);

// update (self or admin)
router.put("/:id", verifyToken, updateFeedback);

router.get("/order/:orderId",   verifyToken, getFeedbackByOrder);

// delete (admin only)
router.delete("/:id", verifyToken, verifyAdmin, deleteFeedback);

export default router;
