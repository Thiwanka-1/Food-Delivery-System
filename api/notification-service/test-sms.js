import dotenv from "dotenv";
dotenv.config();

import Twilio from "twilio";
const client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

(async () => {
  const msg = await client.messages.create({
    to:   "+94788862442",
    from: process.env.TWILIO_PHONE_NUMBER,
    body: "Hello from your Notification Service!"
  });
  console.log("Sent message SID:", msg.sid);
})();
