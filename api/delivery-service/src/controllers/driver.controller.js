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
export const updateDriverLocation = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "latitude & longitude required" });
    }

    // 1) Update in DB
    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    driver.currentLocation = { latitude, longitude };
    await driver.save();

    // 2) Broadcast via Socket.IO (include orderId)
    if (req.app.locals.io) {
      req.app.locals.io.emit("driverLocationUpdate", {
        orderId:  driver.activeOrderId,  // ← MUST be here
        driverId: driver._id,
        latitude: latitude,
        longitude: longitude
      });
    }

    // 3) OPTIONAL: “nearby” SMS alert once per order
    if (driver.activeOrderId) {
      const token = req.cookies.access_token ||
                    (req.headers.authorization?.split(" ")[1] || "");
      const authConfig = { headers: { Cookie: `access_token=${token}` } };

      // fetch the order to get delivery address
      const { data: order } = await axios.get(
        `${process.env.ORDER_SERVICE_URL}/get/${driver.activeOrderId}`,
        authConfig
      );
      const { deliveryAddress } = order;
      const dist = getDistanceFromLatLonInKm(
        latitude,
        longitude,
        deliveryAddress.latitude,
        deliveryAddress.longitude
      );

      if (dist <= 0.5 && !driver.nearAlertSent) {
        // fetch customer contact
        const { data: customer } = await axios.get(
          `${process.env.USER_SERVICE_URL}/${order.userId}`,
          authConfig
        );
        const msg = `Your driver is within ${dist.toFixed(2)}km—be ready for delivery!`;

        await axios.post(
          `${process.env.NOTIFICATION_SERVICE_URL}/sms`,
          {
            to:      customer.phoneNumber,
            message: msg,
            type:    "driver_nearby",
            payload: { orderId: driver.activeOrderId }
          },
          authConfig
        );

        // mark alert sent so we don't spam
        driver.nearAlertSent = true;
        await driver.save();
      }
    }

    // 4) Return the updated driver
    res.json(driver);
  } catch (err) {
    console.error("updateDriverLocation error:", err);
    res.status(500).json({ message: err.message });
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
//     // 0) Normalize orderId
//     let { orderId } = req.body;
//     if (typeof orderId !== "string") {
//       orderId = orderId.toString();
//     }

//     // 1) Extract auth token (cookie or Authorization header)
//     const token =
//       req.cookies?.access_token ||
//       (req.headers.authorization?.startsWith("Bearer ")
//         ? req.headers.authorization.split(" ")[1]
//         : null);
//     if (!token) {
//       return res.status(401).json({ message: "No authentication token found" });
//     }
//     // We'll use this for all internal calls to other services
//     const authConfig = {
//       headers: { Cookie: `access_token=${token}` },
//     };

//     // 2) Fetch the order
//     const { data: order } = await axios.get(
//       `http://localhost:3002/api/orders/get/${orderId}`,
//       authConfig
//     );
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     // 3) Fetch the restaurant (to get location and owner_id)
//     const { data: restaurant } = await axios.get(
//       `http://localhost:3001/api/restaurants/getid/${order.restaurantId}`,
//       authConfig
//     );
//     const {
//       location: { latitude: restLat, longitude: restLon },
//       owner_id: ownerId,
//     } = restaurant;
//     if (restLat == null || restLon == null) {
//       return res
//         .status(500)
//         .json({ message: "Restaurant location not available" });
//     }

//     // 4) Find available drivers
//     const availableDrivers = await Driver.find({ availability: "available" });
//     if (!availableDrivers.length) {
//       return res
//         .status(404)
//         .json({ message: "No available drivers at the moment" });
//     }

//     // 5) Compute distances
//     const driversWithDistance = availableDrivers.map((driver) => {
//       const { latitude, longitude } = driver.currentLocation;
//       const distance = getDistanceFromLatLonInKm(
//         restLat,
//         restLon,
//         latitude,
//         longitude
//       );
//       return { driver, distance };
//     });

//     // 6) Filter by radius (10km), fallback to all
//     const radius = 10;
//     let nearby = driversWithDistance.filter((d) => d.distance <= radius);
//     if (!nearby.length) nearby = driversWithDistance;

//     // 7) Sort by distance then deliveriesCount
//     nearby.sort((a, b) => {
//       if (a.distance === b.distance) {
//         return (a.driver.deliveriesCount || 0) - (b.driver.deliveriesCount || 0);
//       }
//       return a.distance - b.distance;
//     });

//     // 8) Select the best driver
//     const selectedDriver = nearby[0].driver;
//     if (!selectedDriver) throw new Error("Driver assignment failed");

//     // 9) Update order in Order Service
//     const updatePayload = { status: "driver_assigned", driverId: selectedDriver._id };
//     const { data: updatedOrder } = await axios.patch(
//       `http://localhost:3002/api/orders/${orderId}/status`,
//       updatePayload,
//       authConfig
//     );

//     // 10) Mark driver busy & bump count
//     selectedDriver.availability = "busy";
//     selectedDriver.deliveriesCount = (selectedDriver.deliveriesCount || 0) + 1;
//     await selectedDriver.save();

//     // 11) (Optional) Socket.IO broadcast
//     if (req.app.locals.io) {
//       req.app.locals.io.emit("driverAssigned", {
//         orderId,
//         driverId: selectedDriver._id,
//         currentLocation: selectedDriver.currentLocation,
//       });
//     }

//     // ── Notification Section ─────────────────────────────────────────────

//     // Fetch Customer info
//     const { data: customer } = await axios.get(
//       `http://localhost:3000/api/user/${order.userId}`,
//       authConfig
//     );
//     // Fetch Driver info
//     const { data: driverUser } = await axios.get(
//       `http://localhost:3000/api/user/${selectedDriver.userId}`,
//       authConfig
//     );
//     // Fetch Owner info
//     const { data: ownerUser } = await axios.get(
//       `http://localhost:3000/api/user/${ownerId}`,
//       authConfig
//     );

//     // Compose Notification payloads
//     const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;

//     //  ── Customer ──────────────────────────────────────────────────────
//     const custSubject = `Driver on the way for Order ${orderId}`;
//     const custText = `Good news! A driver has been assigned to your order ${orderId}.`;
//     await Promise.all([
//       // Email
//       axios.post(
//         `${notifyUrl}/email`,
//         {
//           to: customer.email,
//           subject: custSubject,
//           text: custText,
//           type: "driver_assigned",
//           payload: { orderId, driverId: selectedDriver._id },
//         },
//         authConfig
//       ),
//       // SMS (if customer has phoneNumber)
//       customer.phoneNumber
//         ? axios.post(
//             `${notifyUrl}/sms`,
//             {
//               to: customer.phoneNumber,
//               message: custText,
//               type: "driver_assigned",
//               payload: { orderId, driverId: selectedDriver._id },
//             },
//             authConfig
//           )
//         : Promise.resolve(),
//     ]);

//     //  ── Driver ────────────────────────────────────────────────────────
//     const drvSubject = `You've been assigned Order ${orderId}`;
//     const drvText = `You are now assigned to pick up order ${orderId} from ${restaurant.name}.`;
//     await Promise.all([
//       axios.post(
//         `${notifyUrl}/email`,
//         {
//           to: driverUser.email,
//           subject: drvSubject,
//           text: drvText,
//           type: "driver_assigned",
//           payload: { orderId },
//         },
//         authConfig
//       ),
//       driverUser.phoneNumber
//         ? axios.post(
//             `${notifyUrl}/sms`,
//             {
//               to: driverUser.phoneNumber,
//               message: drvText,
//               type: "driver_assigned",
//               payload: { orderId },
//             },
//             authConfig
//           )
//         : Promise.resolve(),
//     ]);

//     //  ── Restaurant Owner ───────────────────────────────────────────────
//     const ownerSubject = `Driver Assigned for Order ${orderId}`;
//     const ownerText = `A driver has been assigned to fulfill order ${orderId}.`;
//     await Promise.all([
//       axios.post(
//         `${notifyUrl}/email`,
//         {
//           to: ownerUser.email,
//           subject: ownerSubject,
//           text: ownerText,
//           type: "driver_assigned",
//           payload: { orderId },
//         },
//         authConfig
//       ),
//       ownerUser.phoneNumber
//         ? axios.post(
//             `${notifyUrl}/sms`,
//             {
//               to: ownerUser.phoneNumber,
//               message: ownerText,
//               type: "driver_assigned",
//               payload: { orderId },
//             },
//             authConfig
//           )
//         : Promise.resolve(),
//     ]);

//     // ── End Notifications ──────────────────────────────────────────────

//     return res.json({
//       message: "Driver assigned successfully",
//       order: updatedOrder,
//       driver: selectedDriver,
//     });
//   } catch (error) {
//     console.error("Error in assignDriverToOrder:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };


export const assignDriverToOrder = async (req, res) => {
  try {
    // 1) Normalize orderId
    let { orderId } = req.body;
    if (typeof orderId !== 'string') orderId = orderId.toString();

    // 2) Build auth config for inter-service calls
    const token = req.cookies?.access_token ||
                  (req.headers.authorization?.split(' ')[1] || '');
    const authConfig = { headers: { Cookie: `access_token=${token}` } };

    // 3) Fetch order
    const ORDER_URL = process.env.ORDER_SERVICE_URL;
    const { data: order } = await axios.get(
      `${ORDER_URL}/get/${orderId}`, authConfig
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // 4) Fetch restaurant
    const REST_URL = process.env.RESTAURANT_SERVICE_URL;
    const { data: restaurant } = await axios.get(
      `${REST_URL}/getid/${order.restaurantId}`, authConfig
    );
    const { latitude: restLat, longitude: restLon } = restaurant.location;
    const ownerId = restaurant.owner_id;

    // 5) Find available drivers
    const drivers = await Driver.find({ availability: 'available' });
    const withDist = drivers.map(d => ({
      driver: d,
      distance: getDistanceFromLatLonInKm(
        restLat, restLon,
        d.currentLocation.latitude,
        d.currentLocation.longitude
      )
    }));

    // 6) Filter & sort
    let nearby = withDist.filter(d => d.distance <= 10);
    if (!nearby.length) nearby = withDist;
    nearby.sort((a, b) => {
      if (a.distance === b.distance) {
        return (a.driver.deliveriesCount||0) - (b.driver.deliveriesCount||0);
      }
      return a.distance - b.distance;
    });

    const selected = nearby[0]?.driver;
    if (!selected) throw new Error('No available driver');

    // 7) Update order status
    await axios.patch(
      `${ORDER_URL}/${orderId}/status`,
      { status: 'driver_assigned', driverId: selected._id },
      authConfig
    );

    // 8) Mark driver busy + assign order
    selected.availability     = 'busy';
    selected.activeOrderId    = orderId;
    selected.nearAlertSent    = false;
    selected.deliveriesCount += 1;
    await selected.save();

    // 9) Broadcast via Socket.IO
    const io = req.app.locals.io;
    if (io) {
      io.emit('driverAssigned', {
        orderId,
        driverId: selected._id,
        currentLocation: selected.currentLocation
      });
    }

    const USER_URL  = process.env.USER_SERVICE_URL;
    const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL;

    // fetch all three user records in parallel
    const [{ data: customer }, { data: driverUser }, { data: ownerUser }] =
      await Promise.all([
        axios.get(`${USER_URL}/${order.userId}`,    authConfig),
        axios.get(`${USER_URL}/${selected.userId}`, authConfig),
        axios.get(`${USER_URL}/${ownerId}`,         authConfig),
      ]);

    // helper to catch but not throw
    const safePost = (url, body) => axios.post(url, body, authConfig).catch(console.error);

    // ––––– Customer –––––
    const custText = `A driver is on the way for your order ${orderId}.`;
    await Promise.all([
      // email
      safePost(`${NOTIF_URL}/email`, {
        to:      customer.email,
        subject: `Driver is assigned for Order ${orderId}`,
        text:    custText,
        type:    'driver_assigned',
        payload: { orderId, driverId: selected._id }
      }),
      // sms
      customer.phoneNumber
        ? safePost(`${NOTIF_URL}/sms`, {
            to:      customer.phoneNumber,
            message: custText,
            type:    'driver_assigned',
            payload: { orderId, driverId: selected._id }
          })
        : Promise.resolve()
    ]);

    // ––––– Driver –––––
    const drvText = `Pick up order ${orderId} from ${restaurant.name}.`;
    await Promise.all([
      safePost(`${NOTIF_URL}/email`, {
        to:      driverUser.email,
        subject: `New assignment: Order ${orderId}`,
        text:    drvText,
        type:    'driver_assigned',
        payload: { orderId }
      }),
      driverUser.phoneNumber
        ? safePost(`${NOTIF_URL}/sms`, {
            to:      driverUser.phoneNumber,
            message: drvText,
            type:    'driver_assigned',
            payload: { orderId }
          })
        : Promise.resolve()
    ]);

    // ––––– Owner –––––
    const ownText = `A driver has been assigned to order ${orderId}.`;
    await Promise.all([
      safePost(`${NOTIF_URL}/email`, {
        to:      ownerUser.email,
        subject: `Driver assigned for Order ${orderId}`,
        text:    ownText,
        type:    'driver_assigned',
        payload: { orderId }
      }),
      ownerUser.phoneNumber
        ? safePost(`${NOTIF_URL}/sms`, {
            to:      ownerUser.phoneNumber,
            message: ownText,
            type:    'driver_assigned',
            payload: { orderId }
          })
        : Promise.resolve()
    ]);

    return res.json({
      message: 'Driver assigned successfully',
      order,
      driver: selected
    });

  } catch (error) {
    console.error('assignDriverToOrder error:', error);
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
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ message: "orderId is required" });
  }

  // Build authConfig exactly as before...
  const token = req.cookies?.access_token || (req.headers.authorization?.split(" ")[1] || "");
  const authConfig = { headers: { Cookie: `access_token=${token}` } };

  // 1) Update the order status
  let updatedOrder;
  try {
    const ORDER_URL = process.env.ORDER_SERVICE_URL;
    console.debug("Patching order at:", `${ORDER_URL}/${orderId}/status`);
    const resp = await axios.patch(
      `${ORDER_URL}/${orderId}/status`,
      { status: "picked_up" },
      authConfig
    );
    updatedOrder = resp.data;
  } catch (err) {
    console.error("Order status update failed:", err.response?.status, err.response?.data);
    // If the order really wasn’t found:
    if (err.response?.status === 404) {
      return res.status(404).json({ message: "Order not found when marking picked_up" });
    }
    return res.status(500).json({ message: "Could not update order status: " + (err.message || err) });
  }

  // 2) Broadcast to your clients
  if (req.app.locals.io) {
    req.app.locals.io.emit("orderPickedUp", { orderId });
  }

  // 3) Fetch customer & notify — same as before…
  try {
    const USER_URL  = process.env.USER_SERVICE_URL;
    const customer  = (await axios.get(`${USER_URL}/${updatedOrder.userId}`, authConfig)).data;
    const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL;
    const subject   = `Your Order ${orderId} Is On Its Way`;
    const text      = `Good news! Your order (${orderId}) has been picked up and is on its way to you.`;

    await axios.post(`${NOTIF_URL}/email`, {
      to:      customer.email,
      subject, text,
      type:    "order_picked_up",
      payload: { orderId }
    }, authConfig);

    if (customer.phoneNumber) {
      await axios.post(`${NOTIF_URL}/sms`, {
        to:      customer.phoneNumber,
        message: text,
        type:    "order_picked_up",
        payload: { orderId }
      }, authConfig);
    }

  } catch (notifyErr) {
    console.error("Notify customer failed:", notifyErr);
    // but we don’t want to fail the whole request if notification breaks
  }

  // 4) Return the updated order
  return res.json({
    message: "Order marked as picked up and customer notified",
    order:   updatedOrder
  });
};


export const confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    // 1) Build auth config for inter-service calls
    const token = req.cookies?.access_token ||
                  (req.headers.authorization?.split(" ")[1] || "");
    const authConfig = { headers: { Cookie: `access_token=${token}` } };

    // 2) Mark the order delivered
    const ORDER_URL    = process.env.ORDER_SERVICE_URL;
    const { data: updatedOrder } = await axios.patch(
      `${ORDER_URL}/${orderId}/status`,
      { status: "delivered" },
      authConfig
    );

    // 3) Reset driver availability
    const driverId = updatedOrder.driverId;
    const DELIVERY_URL = process.env.DELIVERY_SERVICE_URL;
    if (driverId) {
      await axios.patch(
        `${DELIVERY_URL}/${driverId}/availability`,
        { availability: "available" },
        authConfig
      );
    }

    // 4) Broadcast Socket.IO event for front-end tracking
    const io = req.app.locals.io;
    if (io) {
      io.emit("orderDelivered", { orderId, driverId });
    }

    // 5) Fetch contacts
    const USER_URL  = process.env.USER_SERVICE_URL;
    const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL;

    // Fetch customer
    const { data: customer } = await axios.get(
      `${USER_URL}/${updatedOrder.userId}`,
      authConfig
    );

    // Fetch driver record (to get their userId), then fetch driver user
    let driverUser = null;
    if (driverId) {
      const { data: driverDoc } = await axios.get(
        `${DELIVERY_URL}/get/${driverId}`,
        authConfig
      );
      if (driverDoc?.userId) {
        const { data } = await axios.get(
          `${USER_URL}/${driverDoc.userId}`,
          authConfig
        );
        driverUser = data;
      }
    }

    // 6) Notify Customer
    const custSubject = `Order ${orderId} Delivered`;
    const custText    = `Good news! Your order (${orderId}) has arrived. Enjoy!`;

    await axios.post(
      `${NOTIF_URL}/email`,
      {
        to:      customer.email,
        subject: custSubject,
        text:    custText,
        type:    "order_delivered",
        payload: { orderId }
      },
      authConfig
    );
    if (customer.phoneNumber) {
      await axios.post(
        `${NOTIF_URL}/sms`,
        {
          to:      customer.phoneNumber,
          message: custText,
          type:    "order_delivered",
          payload: { orderId }
        },
        authConfig
      );
    }

    // 7) Notify Driver (if available)
    if (driverUser) {
      const drvSubject = `Order ${orderId} Delivery Confirmed`;
      const drvText    = `You have successfully delivered order (${orderId}). Thank you!`;

      await axios.post(
        `${NOTIF_URL}/email`,
        {
          to:      driverUser.email,
          subject: drvSubject,
          text:    drvText,
          type:    "order_delivered",
          payload: { orderId }
        },
        authConfig
      );
      if (driverUser.phoneNumber) {
        await axios.post(
          `${NOTIF_URL}/sms`,
          {
            to:      driverUser.phoneNumber,
            message: drvText,
            type:    "order_delivered",
            payload: { orderId }
          },
          authConfig
        );
      }
    }

    // 8) Return success
    return res.json({
      message: "Delivery confirmed & notifications sent",
      order:   updatedOrder
    });
  } catch (error) {
    console.error("confirmDelivery error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const getDriverByUserId = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.params.userId });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (err) {
    console.error("getDriverByUserId error:", err);
    res.status(500).json({ message: err.message });
  }
};