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
      return res.status(400).json({ message: "OrderId and decision are required." });
    }

    // Determine the new status based on the decision
    let newStatus;
    if (decision === "accept") {
      newStatus = "accepted";
    } else if (decision === "reject") {
      newStatus = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid decision. Use 'accept' or 'reject'." });
    }

    // Create a config object with the access token from the incoming cookies
    const config = {
      headers: {
        Cookie: `access_token=${req.cookies.access_token}`
      }
    };
    // Update the order status in the Order Service.
    const orderUpdateResponse = await axios.patch(
      `http://localhost:3002/api/orders/${orderId}/status`,
      { status: newStatus },
      config
    );
    const updatedOrder = orderUpdateResponse.data;

    // If the order was accepted, trigger driver assignment.
    if (newStatus === "accepted") {
      await axios.post("http://localhost:3003/api/drivers/assign", { orderId }, config);
    }

    res.json({ message: `Order ${decision}ed successfully`, order: updatedOrder });
  } catch (error) {
    console.error("Error in decideOrder:", error.message);
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
  const config = { 
    headers: { Cookie: `access_token=${token}` }
  };

  try {
    // 2) Patch order to "ready"
    const { data: updatedOrder } = await axios.patch(
      `http://localhost:3002/api/orders/${orderId}/status`,
      { status: "ready" },
      config
    );

    // 3) **FIXED**: fetch full order using the existing /get/:id route
    const { data: fullOrder } = await axios.get(
      `http://localhost:3002/api/orders/get/${orderId}`,
      config
    );
    const { userId: custId, driverId, restaurantId } = fullOrder;

    // 4) Fetch restaurant details
    const { data: restaurant } = await axios.get(
      `http://localhost:3001/api/restaurants/getid/${restaurantId}`,
      config
    );

    // 5) Fetch customer
    const { data: customer } = await axios.get(
      `http://localhost:3000/api/user/${custId}`,
      config
    );

    // 6) Fetch driver only if assigned
    let driverUser = null;
if (driverId) {
  // 6a) Get the Driver doc from your Delivery Service
  const { data: driverDoc } = await axios.get(
    `http://localhost:3003/api/drivers/get/${driverId}`,
    config
  );
  // 6b) Now fetch the actual User record
  const { data: du } = await axios.get(
    `http://localhost:3000/api/user/${driverDoc.userId}`,
    config
  );
  driverUser = du;
}

    // 7) Dispatch email+SMS via Notification Service
    const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;

    // 7a) Customer
    const custMsg = `Your order ${orderId} is now ready at ${restaurant.name}.`;
    await Promise.all([
      axios.post(
        `${notifyUrl}/email`,
        {
          to: customer.email,
          subject: `Order ${orderId} Ready for Pickup`,
          text: custMsg,
          type: "order_ready",
          payload: { orderId },
        },
        config
      ),
      customer.phoneNumber
        ? axios.post(
            `${notifyUrl}/sms`,
            {
              to: customer.phoneNumber,
              message: custMsg,
              type: "order_ready",
              payload: { orderId },
            },
            config
          )
        : Promise.resolve(),
    ]);

    // 7b) Driver
    if (driverUser) {
      const drvMsg = `Order ${orderId} is ready at ${restaurant.name}. Please pick up.`;
      await Promise.all([
        axios.post(
          `${notifyUrl}/email`,
          {
            to: driverUser.email,
            subject: `Pickup Ready: Order ${orderId}`,
            text: drvMsg,
            type: "order_ready",
            payload: { orderId },
          },
          config
        ),
        driverUser.phoneNumber
          ? axios.post(
              `${notifyUrl}/sms`,
              {
                to: driverUser.phoneNumber,
                message: drvMsg,
                type: "order_ready",
                payload: { orderId },
              },
              config
            )
          : Promise.resolve(),
      ]);
    }

    // 8) Return patched order
    res.json(updatedOrder);
  } catch (error) {
    console.error("markOrderReady error:", error);
    next(error);
  }
};