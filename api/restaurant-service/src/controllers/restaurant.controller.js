// backend/restaurant-service/src/controllers/restaurant.controller.js
import Restaurant from "../models/restaurant.model.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import { errorHandler } from "../utils/error.js";

// Create a new restaurant
export const createRestaurant = async (req, res) => {
  try {
    // Use the authenticated user's id as owner_id
    const restaurantData = { ...req.body, owner_id: req.user.id };
    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Retrieve all restaurants
export const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Retrieve a restaurant by ID
export const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update restaurant details
export const updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a restaurant
export const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle restaurant availability (open/closed)
export const toggleAvailability = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    restaurant.isAvailable = !restaurant.isAvailable;
    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const decideOrder = async (req, res) => {
  try {
    const { orderId, decision } = req.body;
    if (!orderId || !decision) {
      return res
        .status(400)
        .json({ message: "OrderId and decision are required." });
    }

    const newStatus = decision === "accept"
      ? "accepted"
      : decision === "reject"
        ? "rejected"
        : null;
    if (!newStatus) {
      return res
        .status(400)
        .json({ message: "Invalid decision. Use 'accept' or 'reject'." });
    }

    const config = {
      headers: { Cookie: `access_token=${req.cookies.access_token}` }
    };
    const ORDER_URL    = process.env.ORDER_SERVICE_URL;
    const DELIVERY_URL = process.env.DELIVERY_SERVICE_URL;

    // 1) Update order status
    const { data: updatedOrder } = await axios.patch(
      `${ORDER_URL}/${orderId}/status`,
      { status: newStatus },
      config
    );

    // 2) If accepted, trigger driver assignment—but catch its errors
    if (newStatus === "accepted") {
      try {
        await axios.post(
          `${DELIVERY_URL}/assign`,
          { orderId },
          config
        );
      } catch (assignErr) {
        console.error("Failed to assign driver:", assignErr.message);
        // we still want to return success to the restaurant
      }
    }

    // 3) Return success
    res.json({
      message: `Order ${decision}ed successfully`,
      order: updatedOrder
    });

  } catch (error) {
    console.error("Error in decideOrder:", error);
    res.status(500).json({ message: error.message });
  }
};

export const markOrderReady = async (req, res, next) => {
  const { orderId } = req.params;

  // 1) Authenticate
  const token =
    req.cookies?.access_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);
  if (!token) return next(errorHandler(401, "You are not authenticated!"));

  const config = { headers: { Cookie: `access_token=${token}` } };

  try {
    // Service URLs
    const ORDER_URL        = process.env.ORDER_SERVICE_URL;       // http://order:3002/api/orders
    const REST_URL         = process.env.RESTAURANT_SERVICE_URL;  // http://restaurant:3001/api/restaurants
    const USER_URL         = process.env.USER_SERVICE_URL;        // http://auth:3000/api/user
    const DELIVERY_URL     = process.env.DELIVERY_SERVICE_URL;    // http://delivery:3003/api/drivers
    const NOTIF_URL        = process.env.NOTIFICATION_SERVICE_URL;// http://notification:3006/api/notifications

    // 2) Patch order → "ready"
    const { data: updatedOrder } = await axios.patch(
      `${ORDER_URL}/${orderId}/status`,
      { status: "ready" },
      config
    );

    // 3) Fetch full order for IDs
    const { data: fullOrder } = await axios.get(
      `${ORDER_URL}/get/${orderId}`,
      config
    );
    const { userId: custId, driverId, restaurantId } = fullOrder;

    // 4) Fetch restaurant details
    const { data: restaurant } = await axios.get(
      `${REST_URL}/getid/${restaurantId}`,
      config
    );

    // 5) Fetch customer
    const { data: customer } = await axios.get(
      `${USER_URL}/${custId}`,
      config
    );

    // 6) Fetch driver user if assigned
    let driverUser = null;
    if (driverId) {
      const { data: driverDoc } = await axios.get(
        `${DELIVERY_URL}/get/${driverId}`,
        config
      );
      const { data: du } = await axios.get(
        `${USER_URL}/${driverDoc.userId}`,
        config
      );
      driverUser = du;
    }

    // 7) Notify via Notification Service
    const custMsg = `Your order ${orderId} is now ready at ${restaurant.name}.`;
    await Promise.all([
      axios.post(
        `${NOTIF_URL}/email`,
        {
          to: customer.email,
          subject: `Order ${orderId} Ready for Pickup`,
          text: custMsg,
          type: "order_ready",
          payload: { orderId }
        },
        config
      ),
      customer.phoneNumber
        ? axios.post(
            `${NOTIF_URL}/sms`,
            {
              to: customer.phoneNumber,
              message: custMsg,
              type: "order_ready",
              payload: { orderId }
            },
            config
          )
        : Promise.resolve()
    ]);

    if (driverUser) {
      const drvMsg = `Order ${orderId} is ready at ${restaurant.name}. Please pick up.`;
      await Promise.all([
        axios.post(
          `${NOTIF_URL}/email`,
          {
            to: driverUser.email,
            subject: `Pickup Ready: Order ${orderId}`,
            text: drvMsg,
            type: "order_ready",
            payload: { orderId }
          },
          config
        ),
        driverUser.phoneNumber
          ? axios.post(
              `${NOTIF_URL}/sms`,
              {
                to: driverUser.phoneNumber,
                message: drvMsg,
                type: "order_ready",
                payload: { orderId }
              },
              config
            )
          : Promise.resolve()
      ]);
    }

    // 8) Return the patched order
    res.json(updatedOrder);
  } catch (error) {
    console.error("markOrderReady error:", error);
    next(error);
  }
};