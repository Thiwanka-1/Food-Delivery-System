import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  orderItems: [
    {
      menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  deliveryAddress: {
    address: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted","ready","picked_up", "rejected", "driver_assigned", "delivered", "cancelled"],
    default: "pending"
  },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // set when a driver is assigned
}, { timestamps: true });

export default mongoose.model("Order", OrderSchema);