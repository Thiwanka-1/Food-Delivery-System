import Feedback from "../models/feedback.model.js";
import { errorHandler } from "../utils/error.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
/**
 * POST /api/feedback
 * body: { date, foodRating, foodComments, serviceRating, serviceComments,
 *         cleanlinessRating, cleanlinessComments, overallRating, overallComments }
 */
export const createFeedback = async (req, res, next) => {
  const userId = req.user.id;
  const {
    orderId,
    foodRating, foodComments,
    serviceRating, serviceComments,
    cleanlinessRating, cleanlinessComments,
    overallRating, overallComments
  } = req.body;

  if (!orderId) {
    return next(errorHandler(400, "orderId is required"));
  }

  // 1) Build the axios config with the user's cookie
  const token = req.cookies.access_token;
  if (!token) {
    return next(errorHandler(401, "You are not authenticated!"));
  }
  const axiosConfig = {
    headers: { Cookie: `access_token=${token}` }
  };

  // 2) Read the ORDER_SERVICE_URL from .env
  const ORDER_BASE = process.env.ORDER_SERVICE_URL;
  if (!ORDER_BASE) {
    return next(errorHandler(500, "ORDER_SERVICE_URL is not defined in .env"));
  }

  // 3) Construct the exact endpoint your Order service uses.
  //    If your order.routes.js has `router.get("/get/:id", ...)`
  //    then you append `/get/${orderId}`; otherwise drop "get".
  const orderEndpoint = `${ORDER_BASE}/get/${orderId}`;

  try {
    // 4) Call the Order service
    const orderResp = await axios.get(orderEndpoint, axiosConfig);
    const order = orderResp.data;

    // 5) Confirm the user owns that order
    if (order.userId !== userId) {
      return next(errorHandler(403, "You can only leave feedback on your own orders"));
    }

    // 6) Create and save feedback
    const fb = new Feedback({
      order:             orderId,
      user:              userId,
      date:              new Date(),
      foodRating,
      foodComments,
      serviceRating,
      serviceComments,
      cleanlinessRating,
      cleanlinessComments,
      overallRating,
      overallComments
    });
    await fb.save();
    return res.status(201).json(fb);

  } catch (err) {
    // 7) Detailed logging in your console
    console.error("createFeedback ➞ order call failed:", err.response?.data || err.message);

    if (err.code === "ECONNREFUSED") {
      return next(errorHandler(502, `Cannot reach Order service at ${ORDER_BASE}`));
    }
    if (err.response?.status === 404) {
      return next(errorHandler(404, "Order not found"));
    }
    if (err.response?.status === 401) {
      return next(errorHandler(401, "Not authenticated with Order service"));
    }
    // Fallback
    return next(errorHandler(500, err.message));
  }
};
/**
 * GET /api/feedback
 * - If admin: returns all feedback
 * - Otherwise: returns only the current user’s feedback
 */
export const getAllFeedback = async (req, res, next) => {
  try {
    const query = {};
    if (!req.user.isAdmin) {
      query.user = req.user.id;
    }

    const list = await Feedback.find(query)
      .populate("user",  "username email")
      .populate("order", "_id totalPrice status");
    res.json(list);
  } catch (err) {
    next(errorHandler(500, err.message));
  }
};

/**
 * GET /api/feedback/:id
 * - Admins may view any; non-admins only their own.
 */
export const getFeedbackById = async (req, res, next) => {
  try {
    const fb = await Feedback.findById(req.params.id)
      .populate("user",  "username email")
      .populate("order", "_id totalPrice status");
    if (!fb) return next(errorHandler(404, "Feedback not found"));

    if (!req.user.isAdmin && fb.user._id.toString() !== req.user.id) {
      return next(errorHandler(403, "Forbidden"));
    }

    res.json(fb);
  } catch (err) {
    next(errorHandler(500, err.message));
  }
};

/**
 * GET /api/feedback/order/:orderId
 * - Admins see all feedback for that order; non-admins only if it’s theirs.
 */
export const getFeedbackByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const query = { order: orderId };
    // non-admins only see their own feedback
    if (!req.user.isAdmin) {
      query.user = req.user.id;
    }

    // Just return the raw feedback docs:
    const list = await Feedback.find(query).lean();
    return res.json(list);
  } catch (err) {
    next(errorHandler(500, err.message));
  }
};

/**
 * PUT /api/feedback/:id
 */
export const updateFeedback = async (req, res, next) => {
  try {
    const fb = await Feedback.findById(req.params.id);
    if (!fb) return next(errorHandler(404, "Feedback not found"));
    if (!req.user.isAdmin && fb.user.toString() !== req.user.id) {
      return next(errorHandler(403, "Forbidden"));
    }
    Object.assign(fb, req.body);
    await fb.save();
    res.json(fb);
  } catch (err) {
    next(errorHandler(400, err.message));
  }
};

/**
 * DELETE /api/feedback/:id
 * - Only admin may delete
 */
export const deleteFeedback = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return next(errorHandler(403, "Admin only"));
    }
    const fb = await Feedback.findByIdAndDelete(req.params.id);
    if (!fb) return next(errorHandler(404, "Feedback not found"));
    res.json({ message: "Deleted" });
  } catch (err) {
    next(errorHandler(500, err.message));
  }
};
