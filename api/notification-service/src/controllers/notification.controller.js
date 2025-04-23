import nodemailer from "nodemailer";
import Twilio from "twilio";
import Notification from "../models/notification.model.js";
import dotenv from "dotenv";
dotenv.config();
// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Setup Twilio client
const twilioClient = Twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

//  ── Send an in‑app notification (just stored in DB) 
export const createAppNotification = async (req, res, next) => {
  try {
    const { type, message, payload } = req.body;
    const notif = await Notification.create({
      userId: req.user.id,
      channel: "app",
      type,
      message,
      payload
    });
    res.json({ message: "App notification created", notification: notif });
  } catch (err) {
    next(err);
  }
};

//  ── Send an email notification 
export const sendEmail = async (req, res, next) => {
  try {
    const { to, subject, text, html, type, payload } = req.body;
    // send via SMTP
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
    // record in DB
    const notif = await Notification.create({
      userId: req.user.id,
      channel: "email",
      type,
      message: text || html,
      payload
    });
    res.json({ message: "Email sent", notification: notif });
  } catch (err) {
    next(err);
  }
};

//  ── Send an SMS notification 
export const sendSms = async (req, res, next) => {
  try {
    const { to, message, type, payload } = req.body;
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    const notif = await Notification.create({
      userId: req.user.id,
      channel: "sms",
      type,
      message,
      payload
    });
    res.json({ message: "SMS sent", notification: notif });
  } catch (err) {
    next(err);
  }
};

//  ── Get all notifications for the logged‑in user 
export const getNotifications = async (req, res, next) => {
  try {
    const notifs = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    next(err);
  }
};

//  ── Mark a notification as read 
export const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Not found" });
    res.json(notif);
  } catch (err) {
    next(err);
  }
};
