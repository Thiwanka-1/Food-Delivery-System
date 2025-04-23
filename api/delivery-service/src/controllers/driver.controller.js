import Driver from "../models/driver.model.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
// Create a new driver record
export const createDriver = async (req, res, next) => {
  try {
    const { userId, currentLocation, availability } = req.body;
    const newDriver = new Driver({ userId, currentLocation, availability });
    const savedDriver = await newDriver.save();
    res.status(201).json({ message: "Driver created successfully", driver: savedDriver });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update driver's current location
export const updateDriverLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const driverId = req.params.id;
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { currentLocation: { latitude, longitude } },
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    // Emit a real-time update using Socket.IO
    // Assuming each driver is tracking a specific order room, or you broadcast globally:
    req.app.locals.io.emit("driverLocationUpdate", {
      driverId: updatedDriver._id,
      currentLocation: updatedDriver.currentLocation,
    });
    res.json({ message: "Driver location updated", driver: updatedDriver });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get driver details by ID
export const getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deg2rad = (deg) => deg * (Math.PI / 180);
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// export const assignDriverToOrder = async (req, res) => {
//   try {
//     let { orderId } = req.body;
//     if (typeof orderId !== 'string') {
//       orderId = orderId.toString();
//     }

//     // Extract token from request cookies
//     const token = req.cookies.access_token;
//     if (!token) {
//       return res.status(401).json({ message: "No authentication token found" });
//     }
//     // Create headers with the cookie
//     const config = {
//       headers: {
//         Cookie: `access_token=${token}`
//       }
//     };

//     // 1. Fetch order details from Order Service
//     const orderResponse = await axios.get(`http://localhost:3002/api/orders/get/${orderId}`, config);
//     const order = orderResponse.data;
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     // 2. Fetch restaurant details from Restaurant Service
//     const restaurantResponse = await axios.get(`http://localhost:3001/api/restaurants/getid/${order.restaurantId}`, config);
//     const restaurant = restaurantResponse.data;
//     if (!restaurant.location || restaurant.location.latitude == null || restaurant.location.longitude == null) {
//       return res.status(500).json({ message: "Restaurant location not available" });
//     }
//     const { latitude: restLat, longitude: restLon } = restaurant.location;

//     // 3. Find all available drivers
//     const availableDrivers = await Driver.find({ availability: "available" });
//     if (!availableDrivers.length) return res.status(404).json({ message: "No available drivers at the moment" });

//     // 4. Compute distance from restaurant for each available driver
//     const driversWithDistance = availableDrivers.map(driver => {
//       const { latitude, longitude } = driver.currentLocation;
//       const distance = getDistanceFromLatLonInKm(restLat, restLon, latitude, longitude);
//       return { driver, distance };
//     });

//     // 5. Filter drivers within a defined radius (e.g., 10 km)
//     const radius = 10; // km
//     let nearbyDrivers = driversWithDistance.filter(d => d.distance <= radius);
//     if (nearbyDrivers.length === 0) {
//       nearbyDrivers = driversWithDistance; // fallback to all available drivers
//     }

//     // 6. Sort nearby drivers by distance and then by deliveriesCount (least deliveries first)
//     nearbyDrivers.sort((a, b) => {
//       if (a.distance === b.distance) {
//         return (a.driver.deliveriesCount || 0) - (b.driver.deliveriesCount || 0);
//       }
//       return a.distance - b.distance;
//     });

//     // 7. Select the best driver (first in the sorted array)
//     const selectedDriver = nearbyDrivers[0].driver;
//     if (!selectedDriver) throw new Error("Driver assignment failed");

//     // 8. Update the order in Order Service with the assigned driver and new status
//     const updatePayload = { status: "driver_assigned", driverId: selectedDriver._id };
//     const updatedOrderResponse = await axios.patch(`http://localhost:3002/api/orders/${orderId}/status`, updatePayload, config);
//     const updatedOrder = updatedOrderResponse.data;

//     // 9. Update the selected driver's status to "busy" and increment deliveriesCount
//     selectedDriver.availability = "busy";
//     selectedDriver.deliveriesCount = (selectedDriver.deliveriesCount || 0) + 1;
//     await selectedDriver.save();

//     // 10. Optionally emit a Socket.IO event to notify clients
//     if (req.app && req.app.locals && req.app.locals.io) {
//       req.app.locals.io.emit("driverAssigned", {
//         orderId,
//         driverId: selectedDriver._id,
//         currentLocation: selectedDriver.currentLocation
//       });
//     }

//     return res.json({ message: "Driver assigned successfully", order: updatedOrder, driver: selectedDriver });
//   } catch (error) {
//     console.error("Error in assignDriverToOrder:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };


export const assignDriverToOrder = async (req, res) => {
  try {
    // 0) Normalize orderId
    let { orderId } = req.body;
    if (typeof orderId !== "string") {
      orderId = orderId.toString();
    }

    // 1) Extract auth token (cookie or Authorization header)
    const token =
      req.cookies?.access_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);
    if (!token) {
      return res.status(401).json({ message: "No authentication token found" });
    }
    // We'll use this for all internal calls to other services
    const authConfig = {
      headers: { Cookie: `access_token=${token}` },
    };

    // 2) Fetch the order
    const { data: order } = await axios.get(
      `http://localhost:3002/api/orders/get/${orderId}`,
      authConfig
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 3) Fetch the restaurant (to get location and owner_id)
    const { data: restaurant } = await axios.get(
      `http://localhost:3001/api/restaurants/getid/${order.restaurantId}`,
      authConfig
    );
    const {
      location: { latitude: restLat, longitude: restLon },
      owner_id: ownerId,
    } = restaurant;
    if (restLat == null || restLon == null) {
      return res
        .status(500)
        .json({ message: "Restaurant location not available" });
    }

    // 4) Find available drivers
    const availableDrivers = await Driver.find({ availability: "available" });
    if (!availableDrivers.length) {
      return res
        .status(404)
        .json({ message: "No available drivers at the moment" });
    }

    // 5) Compute distances
    const driversWithDistance = availableDrivers.map((driver) => {
      const { latitude, longitude } = driver.currentLocation;
      const distance = getDistanceFromLatLonInKm(
        restLat,
        restLon,
        latitude,
        longitude
      );
      return { driver, distance };
    });

    // 6) Filter by radius (10km), fallback to all
    const radius = 10;
    let nearby = driversWithDistance.filter((d) => d.distance <= radius);
    if (!nearby.length) nearby = driversWithDistance;

    // 7) Sort by distance then deliveriesCount
    nearby.sort((a, b) => {
      if (a.distance === b.distance) {
        return (a.driver.deliveriesCount || 0) - (b.driver.deliveriesCount || 0);
      }
      return a.distance - b.distance;
    });

    // 8) Select the best driver
    const selectedDriver = nearby[0].driver;
    if (!selectedDriver) throw new Error("Driver assignment failed");

    // 9) Update order in Order Service
    const updatePayload = { status: "driver_assigned", driverId: selectedDriver._id };
    const { data: updatedOrder } = await axios.patch(
      `http://localhost:3002/api/orders/${orderId}/status`,
      updatePayload,
      authConfig
    );

    // 10) Mark driver busy & bump count
    selectedDriver.availability = "busy";
    selectedDriver.deliveriesCount = (selectedDriver.deliveriesCount || 0) + 1;
    await selectedDriver.save();

    // 11) (Optional) Socket.IO broadcast
    if (req.app.locals.io) {
      req.app.locals.io.emit("driverAssigned", {
        orderId,
        driverId: selectedDriver._id,
        currentLocation: selectedDriver.currentLocation,
      });
    }

    // ── Notification Section ─────────────────────────────────────────────

    // Fetch Customer info
    const { data: customer } = await axios.get(
      `http://localhost:3000/api/user/${order.userId}`,
      authConfig
    );
    // Fetch Driver info
    const { data: driverUser } = await axios.get(
      `http://localhost:3000/api/user/${selectedDriver.userId}`,
      authConfig
    );
    // Fetch Owner info
    const { data: ownerUser } = await axios.get(
      `http://localhost:3000/api/user/${ownerId}`,
      authConfig
    );

    // Compose Notification payloads
    const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;

    //  ── Customer ──────────────────────────────────────────────────────
    const custSubject = `Driver on the way for Order ${orderId}`;
    const custText = `Good news! A driver has been assigned to your order ${orderId}.`;
    await Promise.all([
      // Email
      axios.post(
        `${notifyUrl}/email`,
        {
          to: customer.email,
          subject: custSubject,
          text: custText,
          type: "driver_assigned",
          payload: { orderId, driverId: selectedDriver._id },
        },
        authConfig
      ),
      // SMS (if customer has phoneNumber)
      customer.phoneNumber
        ? axios.post(
            `${notifyUrl}/sms`,
            {
              to: customer.phoneNumber,
              message: custText,
              type: "driver_assigned",
              payload: { orderId, driverId: selectedDriver._id },
            },
            authConfig
          )
        : Promise.resolve(),
    ]);

    //  ── Driver ────────────────────────────────────────────────────────
    const drvSubject = `You've been assigned Order ${orderId}`;
    const drvText = `You are now assigned to pick up order ${orderId} from ${restaurant.name}.`;
    await Promise.all([
      axios.post(
        `${notifyUrl}/email`,
        {
          to: driverUser.email,
          subject: drvSubject,
          text: drvText,
          type: "driver_assigned",
          payload: { orderId },
        },
        authConfig
      ),
      driverUser.phoneNumber
        ? axios.post(
            `${notifyUrl}/sms`,
            {
              to: driverUser.phoneNumber,
              message: drvText,
              type: "driver_assigned",
              payload: { orderId },
            },
            authConfig
          )
        : Promise.resolve(),
    ]);

    //  ── Restaurant Owner ───────────────────────────────────────────────
    const ownerSubject = `Driver Assigned for Order ${orderId}`;
    const ownerText = `A driver has been assigned to fulfill order ${orderId}.`;
    await Promise.all([
      axios.post(
        `${notifyUrl}/email`,
        {
          to: ownerUser.email,
          subject: ownerSubject,
          text: ownerText,
          type: "driver_assigned",
          payload: { orderId },
        },
        authConfig
      ),
      ownerUser.phoneNumber
        ? axios.post(
            `${notifyUrl}/sms`,
            {
              to: ownerUser.phoneNumber,
              message: ownerText,
              type: "driver_assigned",
              payload: { orderId },
            },
            authConfig
          )
        : Promise.resolve(),
    ]);

    // ── End Notifications ──────────────────────────────────────────────

    return res.json({
      message: "Driver assigned successfully",
      order: updatedOrder,
      driver: selectedDriver,
    });
  } catch (error) {
    console.error("Error in assignDriverToOrder:", error);
    return res.status(500).json({ message: error.message });
  }
};


export const updateDriverAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    const driverId = req.params.id;
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { availability },
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json({ message: "Driver availability updated", driver: updatedDriver });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmPickup = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: "OrderId is required" });
    }
    
    // 1) Extract auth token (cookie or bearer)
    const token =
      req.cookies?.access_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);
    if (!token) {
      return res.status(401).json({ message: "You are not authenticated!" });
    }
    const authConfig = {
      headers: { Cookie: `access_token=${token}` }
    };

    // 2) Update the order status to "picked_up" in Order Service
    const { data: updatedOrder } = await axios.patch(
      `http://localhost:3002/api/orders/${orderId}/status`,
      { status: "picked_up" },
      authConfig
    );

    // 3) Fetch customer details (email + phoneNumber)
    const { data: customer } = await axios.get(
      `http://localhost:3000/api/user/${updatedOrder.userId}`,
      authConfig
    );

    // 4) Build notification payload
    const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;
    const subject = `Your Order ${orderId} Has Been Picked Up`;
    const text    = `Good news! Your order ${orderId} has been picked up by the driver and is on its way to you.`;

    // 5) Send email + SMS to customer
    // Email
    await axios.post(
      `${notifyUrl}/email`,
      {
        to: customer.email,
        subject,
        text,
        type: "order_picked_up",
        payload: { orderId }
      },
      authConfig
    );

    // SMS (if they provided a phoneNumber)
    if (customer.phoneNumber) {
      await axios.post(
        `${notifyUrl}/sms`,
        {
          to: customer.phoneNumber,
          message: text,
          type: "order_picked_up",
          payload: { orderId }
        },
        authConfig
      );
    }

    // 6) Respond
    res.json({
      message: "Order status updated to picked up and customer notified",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error in confirmPickup:", error);
    res.status(500).json({ message: error.message });
  }
};

export const confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    // 1) Authenticate (cookie or Bearer)
    const token =
      req.cookies?.access_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);
    if (!token) {
      return res.status(401).json({ message: "You are not authenticated!" });
    }
    const authConfig = {
      headers: { Cookie: `access_token=${token}` }
    };

    // 2) Update the order status to "delivered" in Order Service
    const { data: updatedOrder } = await axios.patch(
      `http://localhost:3002/api/orders/${orderId}/status`,
      { status: "delivered" },
      authConfig
    );

    // 3) Reset driver's availability in Delivery Service
    const driverId = updatedOrder.driverId;
    if (driverId) {
      await axios.patch(
        `http://localhost:3003/api/drivers/${driverId}/availability`,
        { availability: "available" },
        authConfig
      );
    }

    // 4) Emit real-time event
    if (req.app.locals.io) {
      req.app.locals.io.emit("orderDelivered", { orderId, driverId });
    }

    // ── Notification Section ────────────────────────────────────────────────

    const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;

    // 5) Fetch Customer & Driver details
    const [custRes, drvRes] = await Promise.all([
      axios.get(`http://localhost:3000/api/user/${updatedOrder.userId}`, authConfig),
      driverId
        ? axios.get(`http://localhost:3000/api/user/${driverId}`, authConfig)
        : Promise.resolve({ data: {} })
    ]);
    const customer   = custRes.data;
    const driverUser = drvRes.data;

    // 6) Prepare notifications
    const custSubject = `Order ${orderId} Delivered`;
    const custText    = `Your order ${orderId} has been delivered. Enjoy your meal!`;

    const drvSubject  = `Order ${orderId} Delivery Confirmed`;
    const drvText     = `You have successfully delivered order ${orderId}. Thank you!`;

    // 7) Notify Customer
    await Promise.all([
      // Email
      axios.post(
        `${notifyUrl}/email`,
        {
          to: customer.email,
          subject: custSubject,
          text: custText,
          type: "order_delivered",
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
              type: "order_delivered",
              payload: { orderId }
            },
            authConfig
          )
        : Promise.resolve()
    ]);

    // 8) Notify Driver (if driver exists)
    if (driverUser.email) {
      await Promise.all([
        axios.post(
          `${notifyUrl}/email`,
          {
            to: driverUser.email,
            subject: drvSubject,
            text: drvText,
            type: "order_delivered",
            payload: { orderId }
          },
          authConfig
        ),
        driverUser.phoneNumber
          ? axios.post(
              `${notifyUrl}/sms`,
              {
                to: driverUser.phoneNumber,
                message: drvText,
                type: "order_delivered",
                payload: { orderId }
              },
              authConfig
            )
          : Promise.resolve()
      ]);
    }

    // ── Done ────────────────────────────────────────────────────────────────

    return res.json({ message: "Delivery confirmed and notifications sent", order: updatedOrder });
  } catch (error) {
    console.error("Error in confirmDelivery:", error);
    return res.status(500).json({ message: error.message });
  }
};