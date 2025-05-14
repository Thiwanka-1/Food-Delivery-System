
import dotenv from "dotenv";
dotenv.config();
import Payment from "../models/payment.model.js";
import Stripe from "stripe";
const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2020-08-27" });
import axios   from 'axios';
import jwt from 'jsonwebtoken';

/**
 * Create a Stripe PaymentIntent and record it.
 * Expects { orderId, userId, amount } in req.body.
 */
export const createPayment = async (req, res) => {
  try {
    const { orderId, userId, amount } = req.body;
    if (!orderId || !userId || !amount) {
      return res.status(400).json({ message: "orderId, userId, and amount are required." });
    }

    // Create a PaymentIntent on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),       // convert to cents
      currency: process.env.CURRENCY,
      metadata: { orderId, userId },
    });

    // Record it in our DB; default status = 'pending'
    const payment = new Payment({
      orderId,
      userId,
      amount,
      currency: process.env.CURRENCY,
      paymentIntentId: paymentIntent.id,
    });
    await payment.save();

    // Return clientSecret to the frontend so it can confirm the payment
    res.status(201).json({ clientSecret: paymentIntent.client_secret, paymentId: payment._id });
  } catch (error) {
    console.error("createPayment error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get payment by orderId
 */
export const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Webhook handler to update payment status based on Stripe events.
 * (Optional, but recommended for real-world scenarios.)
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.warn("⚠️  Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    (async () => {
      try {
        const pi = event.data.object;

        // … find & update Payment …
        const payment = await Payment.findOne({ paymentIntentId: pi.id });
        if (!payment) throw new Error("Payment record not found");
        payment.status = 'succeeded';
        await payment.save();

        // fetch the order
        const ORDER_URL = process.env.ORDER_SERVICE_URL;
        const { data: order } = await axios.get(
          `${ORDER_URL}/get/${payment.orderId}`
        );

        // fetch the restaurant owner
        const REST_URL = process.env.RESTAURANT_SERVICE_URL;
        const { data: restaurant } = await axios.get(
          `${REST_URL}/getid/${order.restaurantId}`
        );
        const ownerId = restaurant.owner_id;

        // **use a single JWT for both customer & owner calls**
        const userToken = jwt.sign(
          { id: order.userId, isAdmin: false, role: 'user' },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );
        const axiosConfig = {
          headers: {
            // cookie-parser will pick this up
            Cookie: `access_token=${userToken}`,
            // and your verifyToken util will also check Authorization
            Authorization: `Bearer ${userToken}`,
          },
          withCredentials: true,
        };

        const USER_URL  = process.env.USER_SERVICE_URL;
        const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL;

        // → Owner email
        const { data: ownerUser } = await axios.get(
          `${USER_URL}/${ownerId}`,
          axiosConfig
        );
        await axios.post(
          `${NOTIF_URL}/email`,
          {
            to:      ownerUser.email,
            subject: `New Paid Order ${order._id}`,
            text:    `You have a new paid order (${order._id}).`,
            type:    "order_placed",
            payload: { orderId: order._id }
          },
          axiosConfig
        );
        // → Owner SMS
        if (ownerUser.phoneNumber) {
          await axios.post(
            `${NOTIF_URL}/sms`,
            {
              to:      ownerUser.phoneNumber,
              message: `New paid order ${order._id} received`,
              type:    "order_placed",
              payload: { orderId: order._id }
            },
            axiosConfig
          );
        }

        // → Customer email
        const { data: customer } = await axios.get(
          `${USER_URL}/${order.userId}`,
          axiosConfig
        );
        await axios.post(
          `${NOTIF_URL}/email`,
          {
            to:      customer.email,
            subject: `Order Confirmed ${order._id}`,
            text:    `Your payment for order ${order._id} succeeded.`,
            type:    "payment_succeeded",
            payload: { orderId: order._id }
          },
          axiosConfig
        );
        // → Customer SMS
        if (customer.phoneNumber) {
          await axios.post(
            `${NOTIF_URL}/sms`,
            {
              to:      customer.phoneNumber,
              message: `Payment for order ${order._id} was successful.`,
              type:    "payment_succeeded",
              payload: { orderId: order._id }
            },
            axiosConfig
          );
        }

        console.log(`✅ Notifications sent for order ${order._id}`);
      } catch (err) {
        console.error("⚠️ Webhook handler error:", err);
      }
    })();
  }

  // always acknowledge
  res.json({ received: true });
};


