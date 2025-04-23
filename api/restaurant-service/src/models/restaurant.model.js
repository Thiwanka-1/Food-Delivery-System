// backend/restaurant-service/src/models/Restaurant.js
import mongoose from "mongoose";

const RestaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    isAvailable: { type: Boolean, default: true },
    // Optional attributes:
    rating: { type: Number, default: 0 },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Restaurant", RestaurantSchema);
