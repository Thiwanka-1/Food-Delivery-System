// src/pages/RestaurantDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import { FaEdit, FaTrash, FaArrowLeft, FaStar, FaPlus } from 'react-icons/fa';

export default function RestaurantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // load restaurant
  useEffect(() => {
    fetch(`/api/restaurants/getid/${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data._id) setRestaurant(data);
        else setError(data.message || 'Restaurant not found');
      })
      .catch(() => setError('Server error, please try again.'));
  }, [id]);

  // load menu items
  useEffect(() => {
    fetch(`/api/menu/restaurant/${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMenuItems(data);
      })
      .catch(() => {/* ignore silently */});
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this restaurant?')) return;
    try {
      const res = await fetch(`/api/restaurants/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) navigate('/restaurants/my');
      else alert('Delete failed');
    } catch {
      alert('Server error');
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-1 text-indigo-600 hover:underline mb-4"
          >
            <FaArrowLeft /> <span>Back</span>
          </button>
          <p className="text-red-600">{error}</p>
        </main>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">Loading…</main>
      </div>
    );
  }

  const {
    name,
    address,
    contact,
    isAvailable,
    location,
    rating,
    createdAt,
    updatedAt,
  } = restaurant;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-1 text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft /> <span>Back to My Restaurants</span>
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/restaurants/edit/${id}`)}
              className="inline-flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <FaEdit /> <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center space-x-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              <FaTrash /> <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Restaurant Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden md:flex">
          <div className="p-8 md:w-1/2 space-y-6">
            <h1 className="text-4xl font-extrabold text-gray-800">{name}</h1>
            <span
              className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                isAvailable
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isAvailable ? 'Open' : 'Closed'}
            </span>

            <div className="space-y-2">
              <p className="flex items-start space-x-2">
                <strong className="w-24 text-gray-700">Address:</strong>
                <span className="text-gray-600">{address}</span>
              </p>
              <p className="flex items-start space-x-2">
                <strong className="w-24 text-gray-700">Contact:</strong>
                <span className="text-gray-600">{contact}</span>
              </p>
              <p className="flex items-center space-x-2">
                <strong className="w-24 text-gray-700">Rating:</strong>
                {rating != null ? (
                  <span className="flex items-center space-x-1 text-yellow-500">
                    <FaStar /> {rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-gray-500">No ratings yet</span>
                )}
              </p>
            </div>

            <div className="flex space-x-6 text-gray-500 text-sm">
              <p>
                <strong>Created:</strong>{' '}
                {new Date(createdAt).toLocaleDateString()}
              </p>
              <p>
                <strong>Updated:</strong>{' '}
                {new Date(updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="md:w-1/2 h-80 md:h-auto">
            {isLoaded && location?.latitude && location?.longitude ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={{
                  lat: location.latitude,
                  lng: location.longitude,
                }}
                zoom={16}
              >
                <Marker
                  position={{
                    lat: location.latitude,
                    lng: location.longitude,
                  }}
                />
              </GoogleMap>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Loading map…
              </div>
            )}
          </div>
        </div>

        {/* Menu Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-gray-800">Menu Items</h2>
            <button
              onClick={() => navigate(`/restaurants/${id}/menu/add`)}
              className="inline-flex items-center space-x-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <FaPlus /> <span>Add Item</span>
            </button>
          </div>

          {menuItems.length === 0 ? (
            <p className="text-gray-600">
              No menu items yet.{' '}
              <button
                onClick={() => navigate(`/restaurants/${id}/menu/add`)}
                className="text-blue-600 hover:underline"
              >
                Add one now
              </button>
              .
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {menuItems.map(item => (
                <div
                  key={item._id}
                  className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex flex-col"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {item.name}
                  </h3>
                  <p className="text-gray-600 mb-2 flex-1">{item.description}</p>
                  <p className="text-gray-800 font-bold mb-2">₨ {item.price.toFixed(2)}</p>
                  <span
                    className={`inline-block px-2 py-1 text-sm font-semibold rounded-full mb-4 ${
                      item.isAvailable
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  <div className="mt-auto flex space-x-3">
                    <button
                      onClick={() =>
                        navigate(`/restaurants/${id}/menu/edit/${item._id}`)
                      }
                      className="flex-1 inline-flex items-center justify-center space-x-1 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition"
                    >
                      <FaEdit className="text-blue-600" />
                      <span className="text-gray-700">Edit</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this item?')) return;
                        await fetch(`/api/menu/delete/${item._id}`, {
                          method: 'DELETE',
                          credentials: 'include',
                        });
                        setMenuItems(mi => mi.filter(m => m._id !== item._id));
                      }}
                      className="inline-flex items-center justify-center p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                    >
                      <FaTrash className="text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
