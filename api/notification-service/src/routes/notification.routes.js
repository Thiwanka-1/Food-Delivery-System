import express from "express";
import {
  createAppNotification,
  sendEmail,
  sendSms,
  getNotifications,
  markAsRead
} from "../controllers/notification.controller.js";
import { verifyToken } from "../utils/verifyUser.js"; // copy from your Auth Service

const router = express.Router();

// All routes require a logged‑in user
router.use(verifyToken);

// In‑app notifications
router.post("/app", createAppNotification);
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);

// External channels
router.post("/email", sendEmail);
router.post("/sms", sendSms);

export default router;
