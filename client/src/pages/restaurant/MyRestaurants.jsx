// src/pages/MyRestaurants.jsx
import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Link, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaEye, FaPlus } from 'react-icons/fa';

export default function MyRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [message, setMessage] = useState('');
  const userId = localStorage.getItem('userId');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/restaurants/getall', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRestaurants(data.filter(r => r.owner_id === userId));
        } else {
          setMessage(data.message || 'Failed to load restaurants');
        }
      })
      .catch(() => setMessage('Server error, please try again.'));
  }, [userId]);

  const handleDelete = async id => {
    if (!window.confirm('Delete this restaurant?')) return;
    try {
      const res = await fetch(`/api/restaurants/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to delete');
      } else {
        setRestaurants(prev => prev.filter(r => r._id !== id));
      }
    } catch {
      setMessage('Server error, please try again.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800">My Restaurants</h1>
          <Link
            to="/restaurants/add"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-5 py-3 rounded-lg shadow hover:bg-blue-700 transition"
          >
            <span className="text-lg font-medium">+ New Restaurant</span>
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">
            {message}
          </div>
        )}

        {restaurants.length === 0 ? (
          <div className="text-center text-gray-600">
            No restaurants yet.{' '}
            <Link to="/restaurants/add" className="text-blue-600 hover:underline">
              Add one now
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map(r => (
              <div
                key={r._id}
                className="relative bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex flex-col"
              >
                {/* Status badge */}
                <span
                  className={`absolute top-4 right-4 px-3 py-1 text-sm font-semibold rounded-full ${
                    r.isAvailable
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {r.isAvailable ? 'Open' : 'Closed'}
                </span>

                {/* Info */}
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{r.name}</h2>
                <p className="text-gray-600 mb-1">{r.address}</p>
                <p className="text-gray-600 mb-4">📞 {r.contact}</p>

                {/* Actions */}
                <div className="mt-auto flex space-x-3">
                  <button
                    onClick={() => navigate(`/restaurants/${r._id}`)}
                    className="flex-1 inline-flex items-center justify-center space-x-2 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition"
                  >
                    <FaEye className="text-gray-600" />
                    <span className="text-gray-700 font-medium">View</span>
                  </button>

                  <button
                    onClick={() => navigate(`/restaurants/edit/${r._id}`)}
                    className="inline-flex items-center justify-center p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                  >
                    <FaEdit className="text-blue-600" />
                  </button>

                  <button
                    onClick={() => handleDelete(r._id)}
                    className="inline-flex items-center justify-center p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                  >
                    <FaTrash className="text-red-600" />
                  </button>

                  {/* Add Menu Item button */}
                  <button
                    onClick={() => navigate(`/restaurants/${r._id}/menu/add`)}
                    className="inline-flex items-center justify-center p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                  >
                    <FaPlus className="text-green-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
