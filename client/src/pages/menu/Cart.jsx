// src/pages/Cart.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { FaSpinner, FaPlus, FaMinus, FaTrash, FaMapMarkerAlt } from 'react-icons/fa';

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loadingQty, setLoadingQty] = useState({});
  const [placingOrder, setPlacingOrder] = useState(false);

  // load cart & delivery info
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) setCart(JSON.parse(storedCart));

    const loc = localStorage.getItem('deliveryLocation');
    if (loc) setDeliveryLocation(JSON.parse(loc));
    const addr = localStorage.getItem('deliveryAddress');
    if (addr) setDeliveryAddress(addr);
  }, []);

  const saveCart = updated => {
    setCart(updated);
    if (updated?.items?.length) localStorage.setItem('cart', JSON.stringify(updated));
    else {
      localStorage.removeItem('cart');
      setCart(null);
    }
  };

  const adjustQty = (itemId, delta) => {
    setLoadingQty(q => ({ ...q, [itemId]: true }));
    const updatedItems = cart.items
      .map(it => (it.id === itemId ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it))
      .filter(it => it.quantity > 0);
    const updatedCart = { ...cart, items: updatedItems };
    saveCart(updatedCart);
    setLoadingQty(q => ({ ...q, [itemId]: false }));
  };

  const removeItem = itemId => {
    setLoadingQty(q => ({ ...q, [itemId]: true }));
    const updatedItems = cart.items.filter(it => it.id !== itemId);
    const updatedCart = { ...cart, items: updatedItems };
    saveCart(updatedCart);
    setLoadingQty(q => ({ ...q, [itemId]: false }));
  };

  const total = cart
    ? cart.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
    : 0;

  const handlePlaceOrder = () => {
    setPlacingOrder(true);
    const order = {
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
      items: cart.items,
      delivery: {
        location: deliveryLocation,
        address: deliveryAddress,
      },
      total,
    };
    // navigate to confirmation, passing the order in state
    navigate('/order-confirmation', { state: { order } });
  };

  // Empty cart
  if (!cart) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex flex-col items-center justify-center">
          <p className="text-gray-600 text-xl mb-4">Your cart is empty.</p>
          <button
            onClick={() => navigate('/restaurants')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Browse Restaurants
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 pb-32">
        {/* Delivery bar */}
        <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-2">
          <FaMapMarkerAlt className="text-blue-600" />
          {deliveryAddress ? (
            <span className="text-gray-800">{deliveryAddress}</span>
          ) : deliveryLocation ? (
            <span className="text-gray-800">
              {deliveryLocation.lat.toFixed(6)}, {deliveryLocation.lng.toFixed(6)}
            </span>
          ) : (
            <span className="text-red-600">No delivery location set.</span>
          )}
        </div>

        <h1 className="text-3xl font-bold">{cart.restaurantName}</h1>

        {/* Items grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cart.items.map(item => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col"
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                {item.name}
              </h2>
              <p className="text-gray-600 mb-2">₨ {item.price.toFixed(2)}</p>

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => adjustQty(item.id, -1)}
                    disabled={loadingQty[item.id] || item.quantity <= 1}
                    className="p-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50"
                  >
                    <FaMinus />
                  </button>
                  <span className="text-lg font-medium">{item.quantity}</span>
                  <button
                    onClick={() => adjustQty(item.id, 1)}
                    disabled={loadingQty[item.id]}
                    className="p-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50"
                  >
                    <FaPlus />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={loadingQty[item.id]}
                  className="p-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50"
                >
                  <FaTrash className="text-red-600" />
                </button>
              </div>

              <p className="mt-4 text-right text-gray-700 font-semibold">
                Subtotal: ₨ {(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-lg">
        <span className="text-xl font-semibold">
          Total: ₨ {total.toFixed(2)}
        </span>
        <button
          onClick={handlePlaceOrder}
          disabled={placingOrder}
          className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold ${
            placingOrder
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {placingOrder && <FaSpinner className="animate-spin" />}
          <span>{placingOrder ? 'Processing…' : 'Place Order'}</span>
        </button>
      </div>
    </div>
  );
}
