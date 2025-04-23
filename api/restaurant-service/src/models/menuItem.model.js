// backend/restaurant-service/src/models/MenuItem.js
import mongoose from "mongoose";

const MenuItemSchema = new mongoose.Schema(
  {
    restaurant_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Restaurant" },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    imageUrl: { type: String }, // Stores the AWS S3 image URL
  },
  { timestamps: true }
);

export default mongoose.model("MenuItem", MenuItemSchema);
