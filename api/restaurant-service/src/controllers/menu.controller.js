// backend/restaurant-service/src/controllers/menu.controller.js
import MenuItem from "../models/menuItem.model.js";
import dotenv from "dotenv";
dotenv.config();
// Add a new menu item
export const addMenuItem = async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const { name, description, price, category, isAvailable } = req.body;
      
      // Check if an image was uploaded
      let imageUrl = "";
      if (req.file && req.file.location) {
        imageUrl = req.file.location;
      }
      
      const menuData = {
        restaurant_id: restaurantId,
        name,
        description,
        price,
        category,
        isAvailable,
        imageUrl, // S3 image URL stored here
      };
      
      const menuItem = new MenuItem(menuData);
      await menuItem.save();
      res.status(201).json(menuItem);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// Update an existing menu item
export const updateMenuItem = async (req, res) => {
  try {
    // Copy all provided fields from req.body
    let updateData = { ...req.body };
    
    // If a new image is uploaded, update the imageUrl
    if (req.file && req.file.location) {
      updateData.imageUrl = req.file.location;
    }
    
    // Update the menu item with new data
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
;

// Delete a menu item
export const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }
    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all menu items for a specific restaurant
export const getMenuByRestaurant = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ restaurant_id: req.params.restaurantId });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
