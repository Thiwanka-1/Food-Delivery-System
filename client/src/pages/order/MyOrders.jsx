// src/pages/MyOrders.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { FaSpinner, FaClipboardList } from 'react-icons/fa';

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) {
      navigate('/signin');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/orders/user/${userId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load orders');
        setOrders(data);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, navigate]);

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

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <p className="text-red-600">{error}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center text-gray-600">
            <FaClipboardList className="mx-auto text-6xl mb-4 text-gray-300" />
            <p className="text-xl">You have no orders yet.</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((ord) => {
              const date = new Date(ord.createdAt).toLocaleDateString();
              const total = ord.orderItems.reduce(
                (sum, it) => sum + it.price * it.quantity,
                0
              ).toFixed(2);
              const statusLabel = ord.status.replace(/_/g, ' ');
              const statusStyles = {
                pending: 'bg-yellow-100 text-yellow-800',
                accepted: 'bg-green-100 text-green-800',
                driver_assigned: 'bg-blue-100 text-blue-800',
                picked_up: 'bg-indigo-100 text-indigo-800',
                delivered: 'bg-green-100 text-green-800',
                cancelled: 'bg-red-100 text-red-800',
                rejected: 'bg-red-100 text-red-800',
              }[ord.status] || 'bg-gray-100 text-gray-800';

              return (
                <div
                  key={ord._id}
                  className="cursor-pointer bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex flex-col"
                  onClick={() => navigate(`/orders/${ord._id}`)}
                >
                  <span
                    className={`self-end px-3 py-1 text-sm font-semibold rounded-full ${statusStyles}`}
                  >
                    {statusLabel}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-800 my-2">
                    {ord.restaurant.name}
                  </h2>
                  <p className="text-gray-600">Date: {date}</p>
                  <p className="text-gray-600 mb-4">Total: ₨ {total}</p>
                  <button
                    className="mt-auto inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <span>View Details</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
