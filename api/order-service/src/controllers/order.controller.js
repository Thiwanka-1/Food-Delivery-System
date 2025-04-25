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

    // 2) Extract token for internal calls
    const token = req.cookies.access_token ||
                  (req.headers.authorization?.startsWith("Bearer ")
                     ? req.headers.authorization.split(" ")[1]
                     : null);
    if (!token) {
      return res.status(401).json({ message: "You are not authenticated!" });
    }
    const axiosConfig = { headers: { Cookie: `access_token=${token}` } };

    // 3) Service base-URLs (from .env or Docker service names)
    const REST_URL  = process.env.RESTAURANT_SERVICE_URL;
    const USER_URL  = process.env.USER_SERVICE_URL;
    const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL;

    // 4) Get restaurant → ownerId & contact
    const { data: restaurant } = await axios.get(
      `${REST_URL}/getid/${restaurantId}`,
      axiosConfig
    );
    const { owner_id: ownerId, contact: restaurantPhone } = restaurant;

    // 5) Fetch owner’s details
    const { data: ownerUser } = await axios.get(
      `${USER_URL}/${ownerId}`,
      axiosConfig
    );
    const { email: ownerEmail, phoneNumber: ownerPhone } = ownerUser;

    // 6) Fetch customer’s details
    const { data: customer } = await axios.get(
      `${USER_URL}/${userId}`,
      axiosConfig
    );
    const { email: custEmail, phoneNumber: custPhone } = customer;

    // 7) Notify Restaurant (email + SMS)
    await axios.post(
      `${NOTIF_URL}/email`,
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
        `${NOTIF_URL}/sms`,
        {
          to:      ownerPhone,
          message: `New order ${savedOrder._id} received.`,
          type:    "order_placed",
          payload: { orderId: savedOrder._id }
        },
        axiosConfig
      );
    }

    // 8) Notify Customer (email + SMS)
    await axios.post(
      `${NOTIF_URL}/email`,
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
        `${NOTIF_URL}/sms`,
        {
          to:      custPhone,
          message: `Your order ${savedOrder._id} was placed successfully.`,
          type:    "order_confirmed",
          payload: { orderId: savedOrder._id }
        },
        axiosConfig
      );
    }

    // 9) Return the saved order
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

    // When delivered or cancelled, reset driver availability
    if ((status === "delivered" || status === "cancelled") && order.driverId) {
      const DELIVERY_URL = process.env.DELIVERY_SERVICE_URL;
      const token = req.cookies.access_token;
      await axios.patch(
        `${DELIVERY_URL}/${order.driverId}/availability`,
        { availability: "available" },
        { headers: { Cookie: `access_token=${token}` } }
      );
    }

    res.json(order);
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Retrieve order details by order ID (for tracking)
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const REST_URL = process.env.RESTAURANT_SERVICE_URL;
    const MENU_URL = process.env.MENU_SERVICE_URL;

    // Fetch restaurant
    const { data: restaurant } = await axios.get(
      `${REST_URL}/getid/${order.restaurantId}`
    );

    // Enrich each item
    const enrichedItems = await Promise.all(
      order.orderItems.map(async item => {
        const { data: menu } = await axios.get(
          `${MENU_URL}/restaurant/${order.restaurantId}`
        );
        const menuItemDetails = menu.find(
          mi => mi._id === item.menuItemId.toString()
        );
        return { ...item.toObject(), menuItemDetails };
      })
    );

    res.json({
      ...order.toObject(),
      restaurant,
      orderItems: enrichedItems
    });
  } catch (error) {
    console.error("getOrderById error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id });
    const REST_URL = process.env.RESTAURANT_SERVICE_URL;
    const MENU_URL = process.env.MENU_SERVICE_URL;

    const enrichedOrders = await Promise.all(
      orders.map(async order => {
        const { data: restaurant } = await axios.get(
          `${REST_URL}/getid/${order.restaurantId}`
        );

        const enrichedItems = await Promise.all(
          order.orderItems.map(async item => {
            const { data: menu } = await axios.get(
              `${MENU_URL}/restaurant/${order.restaurantId}`
            );
            const menuItemDetails = menu.find(
              mi => mi._id === item.menuItemId.toString()
            );
            return { ...item.toObject(), menuItemDetails };
          })
        );

        return {
          ...order.toObject(),
          restaurant,
          orderItems: enrichedItems
        };
      })
    );

    res.json(enrichedOrders);
  } catch (error) {
    console.error("getOrdersByUser error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const token =
      req.cookies.access_token ||
      (req.headers.authorization?.split(" ")[1] || "");
    const authConfig = { headers: { Cookie: `access_token=${token}` } };

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = "cancelled";
    await order.save();

    // Reset driver if assigned
    if (order.driverId) {
      const DELIVERY_URL = process.env.DELIVERY_SERVICE_URL;
      await axios.patch(
        `${DELIVERY_URL}/${order.driverId}/availability`,
        { availability: "available" },
        authConfig
      );
    }

    const REST_URL = process.env.RESTAURANT_SERVICE_URL;
    const USER_URL = process.env.USER_SERVICE_URL;
    const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL;

    // 1) Get restaurant → owner
    const { data: restaurant } = await axios.get(
      `${REST_URL}/getid/${order.restaurantId}`
    );
    const ownerId = restaurant.owner_id;

    // 2) Get customer & owner user records
    const [{ data: customer }, { data: ownerUser }] = await Promise.all([
      axios.get(`${USER_URL}/${order.userId}`, authConfig),
      axios.get(`${USER_URL}/${ownerId}`, authConfig)
    ]);

    // 3) Notify both
    const notify = (to, verb, type) =>
      to
        ? axios.post(
            `${NOTIF_URL}/${type}`,
            {
              to,
              subject: verb,
              text: verb,
              type,
              payload: { orderId }
            },
            authConfig
          )
        : Promise.resolve();

    await Promise.all([
      notify(customer.email, `Your Order ${orderId} Was Cancelled`, "email"),
      notify(customer.phoneNumber, `Your Order ${orderId} Was Cancelled`, "sms"),
      notify(ownerUser.email, `Order ${orderId} Cancelled by Customer`, "email"),
      notify(ownerUser.phoneNumber, `Order ${orderId} Cancelled by Customer`, "sms")
    ]);

    res.json({ message: "Order cancelled and notifications sent", order });
  } catch (error) {
    console.error("cancelOrder error:", error);
    res.status(500).json({ message: error.message });
  }
};