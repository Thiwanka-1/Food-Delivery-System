import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const test = (req, res) => {
  res.json({
    message: 'API is working!',
  });
};
export const verifyAdmin = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return next(errorHandler(401, 'Unauthorized access!'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(errorHandler(403, 'Invalid token!'));
    if (!decoded.isAdmin) return next(errorHandler(403, 'Admin access required!'));
    req.user = decoded;
    next();
  });
};
// update user
export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found!' });
    }
    if (!req.user || req.user.id.toString() !== req.params.id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action!' });
    }
    if (req.body.password) {
      req.body.password = bcryptjs.hashSync(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, isAdmin: user.isAdmin, role: user.role } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(500).json({ success: false, message: 'User update failed' });
    }

    const { password, ...rest } = updatedUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    // Check if user is an admin
    if (!req.user || !req.user.isAdmin) {
      return next(errorHandler(403, 'Admin access required!'));
    }

    // Fetch users (excluding password)
    const users = await User.find({}, 'username email profilePicture isAdmin role');

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// delete user
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id); // Find the user making the request

    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    // Only allow deletion if the user is an admin or if the user is deleting their own account
    if (user.isAdmin || req.user.id === req.params.id) {
      await User.findByIdAndDelete(req.params.id);
      return res.status(200).json({ message: 'User has been deleted successfully.' });
    } else {
      return next(errorHandler(403, 'You do not have permission to delete this account.'));
    }
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id, 'email phoneNumber username');
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};