// src/pages/DriverOrders.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { FaSpinner, FaChevronRight } from "react-icons/fa";

export default function DriverOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/orders/driver", { credentials: "include" })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load");
        return data;
      })
      .then(setOrders)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  if (orders.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <p className="text-gray-600">No orders assigned to you.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6">
        <h1 className="text-3xl font-bold">My Assigned Orders</h1>
        <div className="space-y-4">
          {orders.map(o => (
            <div
              key={o._id}
              onClick={() => navigate(`/driver/orders/${o._id}`)}
              className="cursor-pointer bg-white p-4 rounded-lg shadow hover:shadow-lg flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">Order #{o._id}</h2>
                <p className="text-gray-600">Restaurant: {o.restaurant.name}</p>
                <p className="text-gray-600">
                  Deliver to: {o.deliveryAddress.address}
                </p>
                <p className="text-sm text-gray-500">
                  Placed: {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <FaChevronRight className="text-gray-400" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
