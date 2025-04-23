import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import notificationRoutes from "./routes/notification.routes.js";

dotenv.config();
const app = express();

// Parse JSON bodies
app.use(express.json());
// Parse cookies
app.use(cookieParser());
// Enable CORS
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_NOTIFY, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Notification DB connected"))
.catch(err => {
  console.error("Notification DB error:", err);
  process.exit(1);
});

// Mount the notification routes under /api/notifications
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    return res.status(statusCode).json({
      success: false,
      message,
      statusCode,
    });
  });

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`Notification Service on port ${PORT}`));
