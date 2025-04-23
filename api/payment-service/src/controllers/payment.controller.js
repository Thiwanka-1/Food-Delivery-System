
import dotenv from "dotenv";
dotenv.config();
import Payment from "../models/payment.model.js";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2020-08-27" });

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
  const rawBody = req.body; // Buffer from express.raw()
  const sig     = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.warn("⚠️ Webhook signature failed:", err.message);
    // Fallback for local dev
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch (parseErr) {
      console.error("❌ Cannot parse webhook JSON:", parseErr.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  // Only handle succeeded or failed intents
  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const pi = event.data.object;
    const status =
      event.type === "payment_intent.succeeded" ? "succeeded" : "failed";

    // 1) Update DB
    const payment = await Payment.findOne({ paymentIntentId: pi.id });
    if (payment) {
      payment.status = status;
      await payment.save();
      console.log(`✅ Payment ${pi.id} marked ${status} in DB`);

      // 2) Fetch customer contact
      const authConfig = {
        headers: {
          // if you use Bearer token auth, swap this in;
          // we're assuming public user data endpoint for simplicity
        },
      };
      const { data: customer } = await axios.get(
        `${process.env.AUTH_SERVICE_URL}/${payment.userId}`,
        authConfig
      );
      const { email, phoneNumber, username } = customer;

      // 3) Prepare notification payloads
      const notifyUrl = process.env.NOTIFICATION_SERVICE_URL;
      const invoiceHtml = `
        <h1>Invoice for Order ${payment.orderId}</h1>
        <p><strong>Payment ID:</strong> ${payment._id}</p>
        <p><strong>Amount:</strong> ${(payment.amount).toFixed(2)} ${payment.currency.toUpperCase()}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleString()}</p>
      `;
      const emailSubject =
        status === "succeeded"
          ? `Payment Successful for Order ${payment.orderId}`
          : `Payment Failed for Order ${payment.orderId}`;
      const smsMessage =
        status === "succeeded"
          ? `Hi ${username}, your payment for order ${payment.orderId} succeeded!`
          : `Hi ${username}, your payment for order ${payment.orderId} failed.`;

      // 4) Send Email + SMS in parallel
      await Promise.all([
        // Email
        axios.post(
          `${notifyUrl}/email`,
          {
            to: email,
            subject: emailSubject,
            text: smsMessage,
            html: invoiceHtml,
            type:
              status === "succeeded"
                ? "payment_succeeded"
                : "payment_failed",
            payload: {
              paymentId: payment._id,
              orderId: payment.orderId,
            },
          },
          authConfig
        ),

        // SMS (if number exists)
        phoneNumber
          ? axios.post(
              `${notifyUrl}/sms`,
              {
                to: phoneNumber,
                message: smsMessage,
                type:
                  status === "succeeded"
                    ? "payment_succeeded"
                    : "payment_failed",
                payload: {
                  paymentId: payment._id,
                  orderId: payment.orderId,
                },
              },
              authConfig
            )
          : Promise.resolve(),
      ]);
      console.log("📣 Customer notified of payment status");
    }
  }

  // Always respond 200 to Stripe
  res.json({ received: true });
};

