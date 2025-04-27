// src/pages/EditMenuItem.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

export default function EditMenuItem() {
  const { restaurantId, menuItemId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    isAvailable: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  // Load existing item
  useEffect(() => {
    fetch(`/api/menu/restaurant/${restaurantId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const item = data.find(i => i._id === menuItemId);
          if (item) {
            setForm({
              name: item.name,
              description: item.description || '',
              price: item.price.toString(),
              category: item.category,
              isAvailable: item.isAvailable,
            });
            setPreview(item.imageUrl);
          } else {
            setMessage('Menu item not found');
          }
        } else {
          setMessage('Failed to load menu items');
        }
      })
      .catch(() => setMessage('Server error, please try again.'));
  }, [restaurantId, menuItemId]);

  // Simple validation
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.price || isNaN(form.price)) errs.price = 'Valid price is required';
    if (!form.category.trim()) errs.category = 'Category is required';
    return errs;
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors(e => ({ ...e, [name]: '' }));
    setMessage('');
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
      setErrors(e => ({ ...e, image: '' }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const data = new FormData();
    data.append('name', form.name);
    data.append('description', form.description);
    data.append('price', form.price);
    data.append('category', form.category);
    data.append('isAvailable', form.isAvailable);
    if (imageFile) data.append('image', imageFile);

    try {
      const res = await fetch(`/api/menu/update/${menuItemId}`, {
        method: 'PUT',
        credentials: 'include',
        body: data,
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage(result.message || 'Failed to update item');
      } else {
        setMessage('Menu item updated!');
        setTimeout(() => navigate(`/restaurants/${restaurantId}`), 1000);
      }
    } catch {
      setMessage('Server error, please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1 text-gray-600 hover:text-gray-800 mb-4"
        >
          <FaArrowLeft /> <span>Back</span>
        </button>
        <h1 className="text-3xl font-semibold mb-6">Edit Menu Item</h1>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded"
                rows="3"
                placeholder="Short description (optional)"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Price (₨)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            {/* Availability */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isAvailable"
                checked={form.isAvailable}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600"
              />
              <label className="text-gray-700">Available</label>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className={`w-full border rounded p-2 ${
                  errors.image ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.image && (
                <p className="text-red-500 text-xs mt-1">{errors.image}</p>
              )}
              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  className="mt-2 h-24 object-cover rounded"
                />
              )}
            </div>

            {/* Save */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center space-x-2"
            >
              <FaSave /> <span>Save Changes</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
