import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();

export const signup = async (req, res, next) => {
  const {
    username,
    email,
    password,
    role,
    adminSecret,
    latitude,
    longitude,
    phoneNumber
  } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "username, email and password are required." });
  }

  try {
    // 1) Prevent duplicates
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already exists." });
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ message: "Username already exists." });
    }

    // 2) Hash password
    const hashedPassword = bcryptjs.hashSync(password, 10);

    // 3) Determine role/isAdmin
    const allowedRoles = ["user", "owner", "driver"];
    let assignedRole = "user";
    let isAdmin = false;

    if (role === "admin") {
      if (adminSecret !== process.env.ADMIN_SIGNUP_SECRET) {
        return res
          .status(403)
          .json({ message: "Invalid admin signup secret." });
      }
      assignedRole = "admin";
      isAdmin = true;
    } else if (allowedRoles.includes(role)) {
      assignedRole = role;
    }

    // 4) Create the user, including phoneNumber and location
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isAdmin,
      role: assignedRole,
      phoneNumber: phoneNumber || "",
      location: {
        latitude: latitude != null ? latitude : 0,
        longitude: longitude != null ? longitude : 0
      }
    });
    const savedUser = await newUser.save();

    // 5) If driver, also create a record in Delivery Service
    if (assignedRole === "driver") {
      const driverData = {
        userId:          savedUser._id,
        currentLocation: {
          latitude:  newUser.location.latitude,
          longitude: newUser.location.longitude
        },
        availability:    "available",

        // explicit fields matching the updated schema:
        activeOrderId:   null,
        nearAlertSent:   false,
        deliveriesCount: 0
      };

      const DELIVERY_URL = process.env.DELIVERY_SERVICE_URL; 
      // e.g. "http://localhost:3003/api/drivers"
      if (!DELIVERY_URL) {
        console.warn("DELIVERY_SERVICE_URL not set—skipping driver creation.");
      } else {
        try {
          await axios.post(
            `${DELIVERY_URL}/add`,
            driverData,
            { timeout: 5000 }
          );
        } catch (err) {
          console.error("Driver‐service error:", err.message);
          // we don't block signup if driver record fails
        }
      }
    }

    res
      .status(201)
      .json({ message: "User created successfully", userId: savedUser._id });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ message: "Server error." });
  }
};


export const signin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).send({ message: "Email and password are required" });
    }

    const validUser = await User.findOne({ email });
    if (!validUser) return res.status(404).json({ message: 'User not found' });

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return res.status(401).json({ message: 'Wrong credentials' });

    // Include role in token payload
    const token = jwt.sign(
      { id: validUser._id, isAdmin: validUser.isAdmin, role: validUser.role },
      process.env.JWT_SECRET
    );

    const { password: hashedPassword, ...rest } = validUser._doc;
    const expiryDate = new Date(Date.now() + 86400000); // 1 day expiry
    res
      .cookie('access_token', token, { httpOnly: true, expires: expiryDate })
      .status(200)
      .json({ ...rest, token, role: validUser.role });
  } catch (error) {
    console.error('Error in signin:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};



export const signout = (req, res) => {
  res.clearCookie('access_token').status(200).json('Signout success!');
};