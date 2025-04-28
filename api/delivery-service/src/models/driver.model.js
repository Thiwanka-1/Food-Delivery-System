// src/models/driver.model.js
import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    currentLocation: {
      latitude:  { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    availability:    { type: String, enum: ["available","busy","offline"], default: "available" },
    activeOrderId:   { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    nearAlertSent:   { type: Boolean, default: false },
    deliveriesCount: { type: Number,  default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Driver", DriverSchema);
