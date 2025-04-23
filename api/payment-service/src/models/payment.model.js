import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Order" },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  amount: { type: Number, required: true },                // in smallest currency unit (e.g., cents)
  currency: { type: String, default: process.env.CURRENCY || "lkr" },
  status: { 
    type: String, 
    enum: ["pending", "requires_action", "succeeded", "failed"], 
    default: "pending" 
  },
  paymentIntentId: { type: String },                        // Stripe PaymentIntent ID
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("Payment", PaymentSchema);
