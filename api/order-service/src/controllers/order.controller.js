import Order from "../models/order.model.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Create a new order
export const createOrder = async (req, res) => {
  try {
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

    // Return immediately—notifications will fire after payment
    return res.status(201).json(savedOrder);
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({ message: error.message });
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

/**
 * Get all orders for a given restaurant
 */
export const getOrdersByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // Optional: verify that req.user.id is the owner of this restaurant

    const orders = await Order.find({ restaurantId })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("getOrdersByRestaurant error:", error);
    res.status(500).json({ message: error.message });
  }
};


export const getOrdersByDriver = async (req, res) => {
  try {
    // 1) Find “driver” via Delivery service
    const DELIVERY_URL = process.env.DELIVERY_SERVICE_URL; 
    const token =
      req.cookies.access_token ||
      (req.headers.authorization?.split(" ")[1] || "");
    const authHeaders = { headers: { Cookie: `access_token=${token}` } };

    const { data: driver } = await axios.get(
      `${DELIVERY_URL}/user/${req.user.id}`,
      authHeaders
    );
    if (!driver?._id) {
      return res.status(404).json({ message: "Driver record not found" });
    }

    // 2) Query local Orders DB
    const orders = await Order.find({ driverId: driver._id });

    // 3) Enrich them (restaurant + menu) exactly as before
    const REST_URL = process.env.RESTAURANT_SERVICE_URL;
    const MENU_URL = process.env.MENU_SERVICE_URL;

    const enriched = await Promise.all(
      orders.map(async order => {
        const { data: restaurant } = await axios.get(
          `${REST_URL}/getid/${order.restaurantId}`
        );
        const { data: menu } = await axios.get(
          `${MENU_URL}/restaurant/${order.restaurantId}`
        );
        const enrichedItems = order.orderItems.map(item => {
          const menuItemDetails = menu.find(
            mi => mi._id === item.menuItemId.toString()
          );
          return { ...item.toObject(), menuItemDetails };
        });
        return {
          ...order.toObject(),
          restaurant,
          orderItems: enrichedItems
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("getOrdersByDriver error:", error);
    res.status(500).json({ message: error.message });
  }
};