import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  channel: {
    type: String,
    enum: ["email", "sms", "app"],
    required: true
  },
  type: {
    type: String,
    required: true    // e.g. "order_placed", "payment_succeeded"
  },
  message: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("Notification", NotificationSchema);
