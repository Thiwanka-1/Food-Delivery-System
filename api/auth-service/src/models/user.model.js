// backend/user-service/src/models/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username:     { type: String, required: true, unique: true },
    email:        { type: String, required: true, unique: true },
    password:     { type: String, required: true },
    profilePicture:{
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/013/215/160/non_2x/picture-profile-icon-male-icon-human-or-people-sign-and-symbol-vector.jpg",
    },
    isAdmin:      { type: Boolean, default: false },
    role:         { type: String, enum: ["user","owner","driver","admin"], default: "user" },
    phoneNumber:  { type: String },

    // ← New location field for everyone
    location: {
      latitude:  { type: Number, default: 0 },
      longitude: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
