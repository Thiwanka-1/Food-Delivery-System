// backend/restaurant-service/src/controllers/restaurant.controller.js
import Restaurant from "../models/restaurant.model.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
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
  const token = req.cookies.access_token;
  if (!token) return next(errorHandler(401, "You are not authenticated!"));
  const config = { headers: { Cookie: `access_token=${token}` } };

  try {
    // 2) Update order status to "ready"
    const orderUpdate = await axios.patch(
      `http://localhost:3002/api/orders/${orderId}/status`,
      { status: "ready" },
      config
    );
    const updatedOrder = orderUpdate.data;

    // 3) Fetch updated order details to get userId & driverId
    const { data: fullOrder } = await axios.get(
      `http://localhost:3002/api/orders/get/${orderId}`,
      config
    );
    const { userId: custId, driverId, restaurantId } = fullOrder;

    // 4) Fetch restaurant info (for name/address in messages)
    const { data: restaurant } = await axios.get(
      `http://localhost:3001/api/restaurants/getid/${restaurantId}`,
      config
    );

    // 5) Fetch customer & driver user records
    const [custRes, driverRes] = await Promise.all([
      axios.get(`http://localhost:3000/api/user/${custId}`, config),
      axios.get(`http://localhost:3000/api/user/${driverId}`, config)
    ]);
    const customer   = custRes.data;
    const driverUser = driverRes.data;

    // 6) Notify via Email+SMS
    const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;

    // 6a) Customer notification
    const custMsg = `Your order ${orderId} is now ready at ${restaurant.name}.`;
    await Promise.all([
      axios.post(
        `${notifyUrl}/email`,
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
            `${notifyUrl}/sms`,
            { to: customer.phoneNumber, message: custMsg, type: "order_ready", payload: { orderId } },
            config
          )
        : Promise.resolve()
    ]);

    // 6b) Driver notification
    const drvMsg = `Order ${orderId} is ready at ${restaurant.name}. Please pick up.`;
    await Promise.all([
      axios.post(
        `${notifyUrl}/email`,
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
            `${notifyUrl}/sms`,
            { to: driverUser.phoneNumber, message: drvMsg, type: "order_ready", payload: { orderId } },
            config
          )
        : Promise.resolve()
    ]);

    // 7) Return the updated order
    res.json(updatedOrder);

  } catch (error) {
    console.error("markOrderReady error:", error);
    next(error);
  }
};