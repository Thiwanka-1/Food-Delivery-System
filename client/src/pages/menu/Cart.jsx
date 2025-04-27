// src/pages/Cart.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import {
  FaSpinner,
  FaPlus,
  FaMinus,
  FaTrash,
  FaShoppingCart,
  FaTimes,
} from 'react-icons/fa';

export default function Cart() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingQty, setLoadingQty] = useState({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [modalIdx, setModalIdx] = useState(null);

  // Load & normalize on mount
  useEffect(() => {
    const raw = localStorage.getItem('cart');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setOrders(parsed);
        else if (parsed && typeof parsed === 'object') setOrders([parsed]);
      } catch {
        setOrders([]);
      }
    }
  }, []);

  const saveOrders = updated => {
    setOrders(updated);
    if (updated.length) localStorage.setItem('cart', JSON.stringify(updated));
    else localStorage.removeItem('cart');
  };

  // Adjust quantity in order idx for itemId
  const adjustQty = (restIdx, itemId, delta) => {
    setLoadingQty(q => ({ ...q, [`${restIdx}_${itemId}`]: true }));
    const updated = orders.map((ord, i) => {
      if (i !== restIdx) return ord;
      const items = ord.items
        .map(it =>
          it.id === itemId
            ? { ...it, quantity: Math.max(0, it.quantity + delta) }
            : it
        )
        .filter(it => it.quantity > 0);
      return { ...ord, items };
    });
    saveOrders(updated);
    setLoadingQty(q => ({ ...q, [`${restIdx}_${itemId}`]: false }));
  };

  // Remove an item from order idx
  const removeItem = (restIdx, itemId) => {
    setLoadingQty(q => ({ ...q, [`${restIdx}_${itemId}`]: true }));
    const updated = orders
      .map((ord, i) =>
        i === restIdx
          ? { ...ord, items: ord.items.filter(it => it.id !== itemId) }
          : ord
      )
      .filter(ord => ord.items.length > 0);
    saveOrders(updated);
    setLoadingQty(q => ({ ...q, [`${restIdx}_${itemId}`]: false }));
  };

  // Grand total across all restaurants
  const grandTotal = orders.reduce(
    (sum, ord) =>
      sum + ord.items.reduce((s2, it) => s2 + it.price * it.quantity, 0),
    0
  );

  const openModal = idx => setModalIdx(idx);
  const closeModal = () => setModalIdx(null);

  // Save is just close, since changes already persisted
  const saveModalChanges = () => {
    closeModal();
  };

  // Proceed: store the single order and navigate
  const proceedToCheckout = () => {
    const order = orders[modalIdx];
    localStorage.setItem('currentOrder', JSON.stringify(order));
    navigate('/checkout');
  };

  if (!orders.length) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex flex-col items-center justify-center">
          <FaShoppingCart className="text-6xl text-gray-400 mb-4" />
          <p className="text-gray-600 text-xl mb-4">Your cart is empty.</p>
          <button
            onClick={() => navigate('/restaurants/customer')}
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

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((ord, idx) => {
            const subtotal = ord.items.reduce(
              (s, it) => s + it.price * it.quantity,
              0
            );
            return (
              <div
                key={ord.restaurantId}
                onClick={() => openModal(idx)}
                className="cursor-pointer bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all"
              >
                <h2 className="text-2xl font-semibold mb-2">
                  {ord.restaurantName}
                </h2>
                <p className="text-gray-600">
                  {ord.items.length} item{ord.items.length !== 1 && 's'}
                </p>
                <p className="text-gray-800 font-bold mt-4">
                  Total: ₨ {subtotal.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal */}
      {modalIdx !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-2xl p-6 rounded-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
            >
              <FaTimes size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-4">
              {orders[modalIdx].restaurantName}
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6">
              {orders[modalIdx].items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-600">₨ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        adjustQty(modalIdx, item.id, -1)
                      }
                      disabled={
                        loadingQty[`${modalIdx}_${item.id}`] ||
                        item.quantity <= 1
                      }
                      className="p-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50"
                    >
                      <FaMinus />
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        adjustQty(modalIdx, item.id, 1)
                      }
                      disabled={loadingQty[`${modalIdx}_${item.id}`]}
                      className="p-2 border border-gray-300 rounded-full hover:bg-gray-100 disabled:opacity-50"
                    >
                      <FaPlus />
                    </button>
                    <button
                      onClick={() =>
                        removeItem(modalIdx, item.id)
                      }
                      disabled={loadingQty[`${modalIdx}_${item.id}`]}
                      className="p-2 ml-2 text-red-600 hover:bg-gray-100 rounded-full disabled:opacity-50"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal actions */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={saveModalChanges}
                className="px-5 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Save Changes
              </button>
              <button
                onClick={proceedToCheckout}
                className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
