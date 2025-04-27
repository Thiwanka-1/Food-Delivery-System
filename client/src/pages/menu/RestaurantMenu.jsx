// src/pages/RestaurantMenu.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { FaArrowLeft, FaSpinner, FaPlus, FaMinus, FaStar } from 'react-icons/fa';

export default function RestaurantMenu() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  // Load restaurant & menu
  useEffect(() => {
    async function load() {
      try {
        const [rRes, mRes] = await Promise.all([
          fetch(`/api/restaurants/getid/${id}`, { credentials: 'include' }),
          fetch(`/api/menu/restaurant/${id}`, { credentials: 'include' })
        ]);
        const rData = await rRes.json();
        const mData = await mRes.json();
        if (!rRes.ok) throw new Error(rData.message || 'Failed to load restaurant');
        if (!Array.isArray(mData)) throw new Error('Failed to load menu');
        setRestaurant(rData);
        setMenuItems(mData);
        // init quantites to zero
        const initQty = {};
        mData.forEach(item => { initQty[item._id] = 0 });
        setQuantities(initQty);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const adjustQty = (itemId, delta) => {
    setQuantities(q => ({
      ...q,
      [itemId]: Math.max(0, q[itemId] + delta)
    }));
  };

  const totalSelected = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const handleAddToCart = () => {
    setAdding(true);
    // build cart: single restaurant
    const items = menuItems
      .filter(item => quantities[item._id] > 0)
      .map(item => ({
        id: item._id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: quantities[item._id],
      }));
    const cart = {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      items,
    };
    localStorage.setItem('cart', JSON.stringify(cart));
    setAdding(false);
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-gray-500" />
        </main>
      </div>
    );
  }

  if (error || !restaurant) {
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
          <p className="text-red-600">{error || 'Restaurant not found'}</p>
        </main>
      </div>
    );
  }

  const { name, address, isAvailable, rating } = restaurant;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 pb-24 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-1 text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft /> <span>Back to Restaurants</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold">{name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <FaStar className="text-yellow-500" />
              <span>{rating != null ? rating.toFixed(1) : '—'}</span>
              <span className={`ml-4 px-2 py-1 text-sm font-semibold rounded-full ${
                isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isAvailable ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className="text-gray-600 mt-2">{address}</p>
          </div>
        </div>

        {/* Menu Grid */}
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
              <h3 className="text-xl font-semibold text-gray-800 mb-1">{item.name}</h3>
              <p className="text-gray-600 mb-2 flex-1">{item.description}</p>
              <p className="text-gray-800 font-bold mb-2">₨ {item.price.toFixed(2)}</p>
              <span
                className={`inline-block px-2 py-1 text-sm font-semibold rounded-full mb-4 ${
                  item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {item.isAvailable ? 'Available' : 'Unavailable'}
              </span>

              {/* Quantity controls */}
              <div className="flex items-center justify-center space-x-4 mt-auto">
                <button
                  onClick={() => adjustQty(item._id, -1)}
                  disabled={!item.isAvailable || quantities[item._id] === 0}
                  className="p-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50"
                >
                  <FaMinus />
                </button>
                <span className="text-lg font-medium">{quantities[item._id]}</span>
                <button
                  onClick={() => adjustQty(item._id, 1)}
                  disabled={!item.isAvailable}
                  className="p-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50"
                >
                  <FaPlus />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-lg">
        <span className="text-lg">
          {totalSelected} item{totalSelected !== 1 && 's'} selected
        </span>
        <button
          onClick={handleAddToCart}
          disabled={totalSelected === 0 || adding}
          className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold ${
            adding
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {adding && <FaSpinner className="animate-spin" />}
          <span>{adding ? 'Adding…' : `Add ${totalSelected} to Cart`}</span>
        </button>
      </div>
    </div>
  );
}
