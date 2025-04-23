import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    currentLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    availability: { type: String, enum: ["available", "busy", "offline"], default: "available" },
  },
  { timestamps: true }
);

export default mongoose.model("Driver", DriverSchema);
