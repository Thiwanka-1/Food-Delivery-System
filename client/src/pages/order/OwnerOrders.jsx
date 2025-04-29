// src/pages/OwnerOrders.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { FaSpinner, FaClipboardList, FaEye } from 'react-icons/fa';

export default function OwnerOrders() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) return navigate('/signin');

    (async () => {
      try {
        // 1) fetch all restaurants, filter by owner
        const resR = await fetch('/api/restaurants/getall', { credentials:'include' });
        const allR = await resR.json();
        if (!resR.ok) throw new Error(allR.message);
        const mine = allR.filter(r => r.owner_id === userId);
        setRestaurants(mine);

        // 2) for each restaurant fetch its orders
        const fetched = await Promise.all(
          mine.map(r =>
            fetch(`/api/orders/restaurant/${r._id}`, { credentials:'include' })
              .then(r=>r.json())
              .then(list => Array.isArray(list)? list : [])
              .then(list => list.map(o=>({ ...o, restaurantName: r.name })))
          )
        );
        // flatten & sort by date desc
        const flat = fetched.flat().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        setOrders(flat);
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
          <FaSpinner className="animate-spin text-4xl text-gray-500"/>
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
        <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Incoming Orders</h1>
        {orders.length === 0 ? (
          <div className="text-center text-gray-600">
            <FaClipboardList className="mx-auto text-6xl mb-4 text-gray-300"/>
            <p className="text-xl">No orders yet.</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map(o => {
              const date = new Date(o.createdAt).toLocaleDateString();
              const total = o.orderItems.reduce((s,it)=>s+it.price*it.quantity,0).toFixed(2);
              const statusLabel = o.status.replace(/_/g,' ');
              const statusStyles = {
                pending: 'bg-yellow-100 text-yellow-800',
                accepted: 'bg-green-100 text-green-800',
                ready:    'bg-blue-100 text-blue-800',
                driver_assigned: 'bg-indigo-100 text-indigo-800',
                picked_up:      'bg-purple-100 text-purple-800',
                delivered:      'bg-green-100 text-green-800',
                cancelled:      'bg-red-100 text-red-800',
                rejected:       'bg-red-100 text-red-800',
              }[o.status]||'bg-gray-100 text-gray-800';

              return (
                <div
                  key={o._id}
                  className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition flex flex-col"
                >
                  <span className={`self-end px-3 py-1 rounded-full ${statusStyles}`}>
                    {statusLabel}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-800 my-2">{o.restaurantName}</h2>
                  <p className="text-gray-600">Order #{o._id.slice(-6)}</p>
                  <p className="text-gray-600">Date: {date}</p>
                  <p className="text-gray-600 mb-4">Total: ₨ {total}</p>
                  <button
                    onClick={()=>navigate(`/owner/orders/${o._id}`)}
                    className="mt-auto inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <FaEye/> <span>View</span>
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
