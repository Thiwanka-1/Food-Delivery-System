import Order from "../models/order.model.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Create a new order
export const createOrder = async (req, res) => {
  try {
    // 1) Save the order
    const { orderItems, restaurantId, deliveryAddress, totalPrice } = req.body;
    const userId = req.user.id;
    if (!orderItems || !restaurantId || !deliveryAddress || !totalPrice) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const newOrder = new Order({
      orderItems,
      userId,
      restaurantId,
      deliveryAddress,
      totalPrice,
      status: "pending",
    });
    const savedOrder = await newOrder.save();

    // 2) Prepare the cookie-based auth header for internal calls
    const token = req.cookies.access_token ||
                  (req.headers.authorization?.startsWith("Bearer ")
                     ? req.headers.authorization.split(" ")[1]
                     : null);
    if (!token) {
      return res.status(401).json({ message: "You are not authenticated!" });
    }
    const axiosConfig = {
      headers: { Cookie: `access_token=${token}` }
    };

    // 3) Get restaurant → ownerId & restaurantPhone
    const { data: restaurant } = await axios.get(
      `http://localhost:3001/api/restaurants/getid/${restaurantId}`,
      axiosConfig
    );
    const { owner_id: ownerId, contact: restaurantPhone } = restaurant;

    // 4) Fetch owner’s user details
    const { data: ownerUser } = await axios.get(
      `http://localhost:3000/api/user/${ownerId}`,
      axiosConfig
    );
    const { email: ownerEmail, phoneNumber: ownerPhone } = ownerUser;

    // 5) Fetch customer’s details
    const { data: customer } = await axios.get(
      `http://localhost:3000/api/user/${userId}`,
      axiosConfig
    );
    const { email: custEmail, phoneNumber: custPhone } = customer;

    // 6) Notify Restaurant (email + SMS)
    await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL}/email`,
      {
        to:      ownerEmail,
        subject: "New Order Received",
        text:    `You have a new order (${savedOrder._id}).`,
        type:    "order_placed",
        payload: { orderId: savedOrder._id }
      },
      axiosConfig
    );
    if (ownerPhone) {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/sms`,
        {
          to:      ownerPhone,
          message: `New order ${savedOrder._id} received.`,
          type:    "order_placed",
          payload: { orderId: savedOrder._id }
        },
        axiosConfig
      );
    }

    // 7) Notify Customer (email + SMS)
    await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL}/email`,
      {
        to:      custEmail,
        subject: "Order Placed Successfully",
        text:    `Your order (${savedOrder._id}) has been placed.`,
        type:    "order_confirmed",
        payload: { orderId: savedOrder._id }
      },
      axiosConfig
    );
    if (custPhone) {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/sms`,
        {
          to:      custPhone,
          message: `Your order ${savedOrder._id} was placed successfully.`,
          type:    "order_confirmed",
          payload: { orderId: savedOrder._id }
        },
        axiosConfig
      );
    }

    // 8) Return the saved order
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error("createOrder error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update order details (if modifications are allowed)
export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status (triggered by restaurant acceptance, driver assignment, or delivery completion)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    order.status = status;
    if (status === "driver_assigned" && req.body.driverId) {
      order.driverId = req.body.driverId;
    }
    await order.save();

    // When the order is delivered or cancelled, reset driver's availability via Delivery Service API
    if ((status === "delivered" || status === "cancelled") && order.driverId) {
      await axios.patch(
        `http://localhost:3003/api/drivers/${order.driverId}/availability`,
        { availability: "available" },
        {
          headers: {
            Cookie: `access_token=${req.cookies.access_token}`
          }
        }
      );
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Retrieve order details by order ID (for tracking)
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Fetch restaurant details using the updated URL
    const restaurantResponse = await axios.get(`http://localhost:3001/api/restaurants/getid/${order.restaurantId}`);
    const restaurantData = restaurantResponse.data;

    // For each order item, fetch the full restaurant menu and filter for the matching menu item
    const enrichedItems = await Promise.all(order.orderItems.map(async (item) => {
      const menuResponse = await axios.get(`http://localhost:3001/api/menu/restaurant/${order.restaurantId}`);
      // Assuming menuResponse.data is an array of menu items
      const menuItemDetails = menuResponse.data.find(mi => mi._id === item.menuItemId.toString());
      return { ...item.toObject(), menuItemDetails };
    }));

    const enrichedOrder = {
      ...order.toObject(),
      restaurant: restaurantData,
      orderItems: enrichedItems
    };

    res.json(enrichedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });

    // Enrich each order with restaurant and menu item details
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      // Fetch restaurant details
      const restaurantResponse = await axios.get(`http://localhost:3001/api/restaurants/getid/${order.restaurantId}`);
      const restaurantData = restaurantResponse.data;

      // For each order item, fetch the full restaurant menu and filter for the matching menu item details
      const enrichedItems = await Promise.all(order.orderItems.map(async (item) => {
        const menuResponse = await axios.get(`http://localhost:3001/api/menu/restaurant/${order.restaurantId}`);
        // Filter the menu response to get only the menu item that matches the order item's menuItemId
        const menuItemDetails = menuResponse.data.find(mi => mi._id === item.menuItemId.toString());
        return { ...item.toObject(), menuItemDetails };
      }));

      return { ...order.toObject(), restaurant: restaurantData, orderItems: enrichedItems };
    }));

    res.json(enrichedOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // 1) Auth token (cookie or Bearer)
    const token =
      req.cookies?.access_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);
    if (!token) {
      return res.status(401).json({ message: "You are not authenticated!" });
    }
    const authConfig = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 2) Fetch the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 3) Update status to "cancelled"
    order.status = "cancelled";
    await order.save();

    // 4) If a driver was assigned, reset their availability
    if (order.driverId) {
      await axios.patch(
        `http://localhost:3003/api/drivers/${order.driverId}/availability`,
        { availability: "available" },
        authConfig
      );
    }

    // ── Notifications ───────────────────────────────────────

    const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;
    const { userId, restaurantId } = order;

    // 5) Fetch restaurant owner ID & restaurant name
    const { data: restaurant } = await axios.get(
      `http://localhost:3001/api/restaurants/getid/${restaurantId}`,
      authConfig
    );
    const ownerId = restaurant.owner_id;

    // 6) Fetch user records for customer & owner
    const [custRes, ownerRes] = await Promise.all([
      axios.get(`http://localhost:3000/api/user/${userId}`, authConfig),
      axios.get(`http://localhost:3000/api/user/${ownerId}`, authConfig),
    ]);
    const customer  = custRes.data;
    const ownerUser = ownerRes.data;

    // 7) Compose messages
    const custSubject = `Your Order ${orderId} Was Cancelled`;
    const custText    = `Your order (${orderId}) has been successfully cancelled.`;
    const ownerSubject= `Order ${orderId} Cancelled by Customer`;
    const ownerText   = `Order (${orderId}) has been cancelled by the customer.`;

    // 8) Notify Customer
    await Promise.all([
      // Email
      axios.post(
        `${notifyUrl}/email`,
        {
          to: customer.email,
          subject: custSubject,
          text: custText,
          type: "order_cancelled",
          payload: { orderId }
        },
        authConfig
      ),
      // SMS if available
      customer.phoneNumber
        ? axios.post(
            `${notifyUrl}/sms`,
            {
              to: customer.phoneNumber,
              message: custText,
              type: "order_cancelled",
              payload: { orderId }
            },
            authConfig
          )
        : Promise.resolve()
    ]);

    // 9) Notify Restaurant Owner
    await Promise.all([
      axios.post(
        `${notifyUrl}/email`,
        {
          to: ownerUser.email,
          subject: ownerSubject,
          text: ownerText,
          type: "order_cancelled",
          payload: { orderId }
        },
        authConfig
      ),
      ownerUser.phoneNumber
        ? axios.post(
            `${notifyUrl}/sms`,
            {
              to: ownerUser.phoneNumber,
              message: ownerText,
              type: "order_cancelled",
              payload: { orderId }
            },
            authConfig
          )
        : Promise.resolve()
    ]);

    // ── End Notifications ────────────────────────────────────

    return res.json({
      message: "Order cancelled and notifications sent",
      order
    });
  } catch (error) {
    console.error("cancelOrder error:", error);
    return res.status(500).json({ message: error.message });
  }
};