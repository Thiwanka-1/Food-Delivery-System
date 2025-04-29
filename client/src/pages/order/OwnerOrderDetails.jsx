// src/pages/OwnerOrderDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { FaSpinner } from 'react-icons/fa';

export default function OwnerOrderDetails() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const [order, setOrder]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load order details
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/orders/get/${orderId}`, { credentials:'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setOrder(data);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // Accept / Reject
  const handleDecision = async (decision) => {
    setActionLoading(true);
    try {
      const res  = await fetch('/api/restaurants/orders/decision', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ orderId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrder(data.order);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Ready
  const markReady = async () => {
    setActionLoading(true);
    try {
      const res  = await fetch(`/api/restaurants/orders/${orderId}/ready`, {
        method:      'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrder(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar/>
        <main className="flex-1 p-8 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-gray-500"/>
        </main>
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar/>
        <main className="flex-1 p-8">
          <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline mb-4">
            &larr; Back
          </button>
          <p className="text-red-600">{error || 'Order not found'}</p>
        </main>
      </div>
    );
  }

  const date     = new Date(order.createdAt).toLocaleString();
  const subtotal = order.orderItems
    .reduce((s, it) => s + it.price * it.quantity, 0)
    .toFixed(2);
  const status   = order.status;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar/>
      <main className="flex-1 p-8 space-y-6">
        <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline">
          &larr; Back
        </button>

        <h1 className="text-3xl font-bold">Order #{order._id}</h1>
        <p className="text-gray-600">Placed: {date}</p>

        <span
          className={`px-3 py-1 inline-block rounded-full text-sm font-semibold ${
            status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : status === 'accepted'
              ? 'bg-green-100 text-green-800'
              : status === 'driver_assigned'
              ? 'bg-blue-100 text-blue-800'
              : status === 'ready'
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status.replace(/_/g,' ')}
        </span>

        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-2xl font-semibold">Items</h2>
          <ul className="divide-y">
            {order.orderItems.map(it => {
              const name      = it.menuItemDetails?.name || 'Unknown item';
              const qty       = it.quantity;
              const lineTotal = (it.price * qty).toFixed(2);
              return (
                <li key={it.menuItemId} className="py-2 flex justify-between">
                  <span>{name} × {qty}</span>
                  <span>₨ {lineTotal}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-right text-lg font-semibold">
            Subtotal: ₨ {subtotal}
          </p>
        </div>

        {/* Accept/Reject only when still pending */}
        {status === 'pending' && (
          <div className="space-x-4">
            <button
              onClick={() => handleDecision('accept')}
              disabled={actionLoading}
              className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? '…' : 'Accept Order'}
            </button>
            <button
              onClick={() => handleDecision('reject')}
              disabled={actionLoading}
              className="bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? '…' : 'Reject Order'}
            </button>
          </div>
        )}

        {/* Mark as Ready after accepted or once driver is assigned */}
        {(status === 'accepted' || status === 'driver_assigned') && (
          <button
            onClick={markReady}
            disabled={actionLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading ? '…' : 'Mark as Ready'}
          </button>
        )}
      </main>
    </div>
  );
}
