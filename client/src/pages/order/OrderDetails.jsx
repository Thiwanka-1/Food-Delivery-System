// src/pages/order/OrderDetails.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { io } from 'socket.io-client';
import {
  useLoadScript,
  GoogleMap,
  Marker,
  DirectionsRenderer,
} from '@react-google-maps/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { FaSpinner, FaStar } from 'react-icons/fa';

const libraries = ['places', 'geometry'];

// Reusable 5-star selector component
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <FaStar
          key={i}
          size={24}
          className={`mx-1 cursor-pointer ${
            i <= (hover || value) ? 'text-yellow-400' : 'text-gray-300'
          }`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        />
      ))}
    </div>
  );
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [driverLoc, setDriverLoc] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [directions, setDirections] = useState(null);

  // Feedback state
  const [feedback, setFeedback] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    foodRating: 5,
    foodComments: '',
    serviceRating: 5,
    serviceComments: '',
    cleanlinessRating: 5,
    cleanlinessComments: '',
    overallRating: 5,
    overallComments: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lastComputeRef = useRef(0);
  const socketRef = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // 1) Load order & payment
  useEffect(() => {
    (async () => {
      try {
        const oRes = await fetch(`/api/orders/get/${orderId}`, { credentials: 'include' });
        const oData = await oRes.json();
        if (!oRes.ok) throw new Error(oData.message);
        setOrder(oData);
        setStatus(oData.status);

        const pRes = await fetch(`/api/payments/order/${orderId}`, { credentials: 'include' });
        const pData = await pRes.json();
        setPaymentStatus(pRes.ok ? pData.status : 'unknown');
      } catch (e) {
        console.error(e);
      }
    })();
  }, [orderId]);

  // 2) Fetch feedback once delivered
  useEffect(() => {
    if (status !== 'delivered') return;
    setFbLoading(true);
    fetch(`/api/feedback/order/${orderId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(list => {
        if (Array.isArray(list) && list.length) setFeedback(list[0]);
      })
      .catch(e => {
        console.error('Fetch feedback failed:', e);
        setFbError('Could not load feedback');
      })
      .finally(() => setFbLoading(false));
  }, [status, orderId]);

  // 3) Load driver info helper
  const loadDriverInfo = useCallback(async driverId => {
    try {
      const drvRes = await fetch(`/api/drivers/get/${driverId}`, { credentials: 'include' });
      const drvData = await drvRes.json();
      if (!drvRes.ok) throw new Error(drvData.message);

      const userRes = await fetch(`/api/user/${drvData.userId}`, { credentials: 'include' });
      const userData = await userRes.json();
      if (!userRes.ok) throw new Error(userData.message);

      setDriverInfo(userData);
    } catch (err) {
      console.error('Failed to load driver info:', err);
    }
  }, []);

  // 4) Initial driver location & info
  useEffect(() => {
    if (!order?.driverId) return;
    fetch(`/api/drivers/get/${order.driverId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.currentLocation) {
          setDriverLoc({
            lat: d.currentLocation.latitude,
            lng: d.currentLocation.longitude,
          });
        }
      })
      .catch(console.error);
    loadDriverInfo(order.driverId);
  }, [order?.driverId, loadDriverInfo]);

  // 5) Socket.IO for live updates
  useEffect(() => {
    const socket = io('http://localhost:8081', {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
    });
    socketRef.current = socket;
    const oid = orderId.toString();

    socket.on('driverAssigned', payload => {
      if (payload.orderId?.toString() === oid) {
        setDriverLoc({
          lat: payload.currentLocation.latitude,
          lng: payload.currentLocation.longitude,
        });
        setStatus('driver_assigned');
        loadDriverInfo(payload.driverId);
      }
    });
    socket.on('driverLocationUpdate', payload => {
      if (payload.orderId?.toString() === oid) {
        setDriverLoc({ lat: payload.latitude, lng: payload.longitude });
      }
    });
    socket.on('orderPickedUp', payload => {
      if (payload.orderId?.toString() === oid) setStatus('picked_up');
    });
    socket.on('orderDelivered', payload => {
      if (payload.orderId?.toString() === oid) setStatus('delivered');
    });

    return () => socket.disconnect();
  }, [orderId, loadDriverInfo]);

  // 6) Compute route (throttled)
  const computeRoute = useCallback(() => {
    if (!isLoaded || !order || !driverLoc) return;
    let origin, destination;

    if (['pending', 'driver_assigned', 'ready'].includes(status)) {
      origin = driverLoc;
      destination = {
        lat: order.restaurant.location.latitude,
        lng: order.restaurant.location.longitude,
      };
    } else if (status === 'picked_up') {
      origin = driverLoc;
      destination = {
        lat: order.deliveryAddress.latitude,
        lng: order.deliveryAddress.longitude,
      };
    } else if (status === 'delivered') {
      origin = {
        lat: order.restaurant.location.latitude,
        lng: order.restaurant.location.longitude,
      };
      destination = {
        lat: order.deliveryAddress.latitude,
        lng: order.deliveryAddress.longitude,
      };
    } else {
      return;
    }

    const now = Date.now();
    if (now - lastComputeRef.current < 5000) return;
    lastComputeRef.current = now;

    new window.google.maps.DirectionsService().route(
      { origin, destination, travelMode: 'DRIVING' },
      (result, stat) => {
        if (stat === 'OK') setDirections(result);
      }
    );
  }, [isLoaded, order, driverLoc, status]);

  // 7) Receipt generator
  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Quick Eats Receipt', 14, 22);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order._id}`, 14, 32);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 14, 38);
    doc.text(`Restaurant: ${order.restaurant.name}`, 14, 44);
    doc.text(`Address: ${order.restaurant.address}`, 14, 50);
    doc.text(`Payment: ${paymentStatus}`, 14, 56);
    doc.text(`Status: ${status.replace(/_/g, ' ')}`, 14, 62);
    if (driverInfo) {
      doc.text(`Driver: ${driverInfo.username}`, 14, 68);
      doc.text(`Driver Phone: ${driverInfo.phoneNumber}`, 14, 74);
    }

    const cols = ['Item', 'Qty', 'Unit Price', 'Total'];
    const rows = order.orderItems.map(it => [
      it.menuItemDetails.name,
      it.quantity.toString(),
      `₨ ${it.price.toFixed(2)}`,
      `₨ ${(it.price * it.quantity).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 80,
      head: [cols],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    const subtotal = order.orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    doc.text(`Subtotal: ₨ ${subtotal.toFixed(2)}`, 14, finalY);
    doc.text(`Total: ₨ ${order.totalPrice.toFixed(2)}`, 14, finalY + 8);

    doc.save(`receipt_${order._id}.pdf`);
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <p className="text-red-600">Error loading Google Maps</p>
        </main>
      </div>
    );
  }

  if (!isLoaded || !order) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-gray-500" />
        </main>
      </div>
    );
  }

  // Map positions
  const restaurantPos = {
    lat: order.restaurant.location.latitude,
    lng: order.restaurant.location.longitude,
  };
  const deliveryPos = {
    lat: order.deliveryAddress.latitude,
    lng: order.deliveryAddress.longitude,
  };
  const mapCenter = driverLoc || restaurantPos;

  // 8) Handle feedback form submission
  const handleFeedbackSubmit = async () => {
    if (
      !form.foodRating ||
      !form.serviceRating ||
      !form.cleanlinessRating ||
      !form.overallRating
    ) {
      setFormError('Please provide all ratings.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit');
      setFeedback(data);
      setShowModal(false);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <h1 className="text-3xl font-bold">Order #{order._id}</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={downloadReceipt}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Download Receipt
            </button>
            <span
              className={`px-3 py-1 rounded-full ${
                paymentStatus === 'succeeded'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {paymentStatus === 'succeeded' ? 'Paid' : paymentStatus}
            </span>
            <span
              className={`px-3 py-1 rounded-full ${
                status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : status === 'driver_assigned'
                  ? 'bg-blue-100 text-blue-800'
                  : status === 'picked_up'
                  ? 'bg-indigo-100 text-indigo-800'
                  : status === 'delivered'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Driver Details */}
        {driverInfo && (
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-xl font-semibold mb-2">Driver Details</h2>
            <p><strong>Name:</strong> {driverInfo.username}</p>
            <p><strong>Phone:</strong> {driverInfo.phoneNumber}</p>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-96">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={12}
            onLoad={() => computeRoute()}
            onIdle={() => computeRoute()}
          >
            <Marker
              position={restaurantPos}
              icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            />
            <Marker
              position={deliveryPos}
              icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
            />
            {driverLoc && status !== 'delivered' && (
              <Marker
                position={driverLoc}
                icon="http://maps.google.com/mapfiles/ms/icons/truck.png"
              />
            )}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{ suppressMarkers: true, polylineOptions: { strokeWeight: 6 } }}
              />
            )}
          </GoogleMap>
        </div>

        {/* Order Items */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-2xl font-semibold">Details</h2>
          <p>
            <strong>Restaurant:</strong> {order.restaurant.name}, {order.restaurant.address}
          </p>
          <p>
            <strong>Delivery To:</strong> {order.deliveryAddress.address}
          </p>
          <h3 className="text-xl font-semibold mt-4">Items</h3>
          <ul className="divide-y">
            {order.orderItems.map(item => (
              <li key={item.menuItemId} className="py-2 flex justify-between">
                <span>
                  {item.menuItemDetails.name} × {item.quantity}
                </span>
                <span>₨ {(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Redesigned Feedback Section */}
        {status === 'delivered' && (
          <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
            <h2 className="text-2xl font-bold">Your Feedback</h2>

            {fbLoading ? (
              <div className="flex justify-center">
                <FaSpinner className="animate-spin text-3xl text-gray-500" />
              </div>
            ) : feedback ? (
              <div className="space-y-4">
                {[
                  { key: 'food', label: 'Food' },
                  { key: 'service', label: 'Service' },
                  { key: 'cleanliness', label: 'Cleanliness' },
                  { key: 'overall', label: 'Overall' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-start space-x-4">
                    <span className="w-32 font-semibold">{label}:</span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map(i => (
                        <FaStar
                          key={i}
                          size={20}
                          className={
                            i <= feedback[`${key}Rating`]
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                    {feedback[`${key}Comments`] && (
                      <p className="ml-4 text-gray-600 italic">
                        {feedback[`${key}Comments`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition"
                >
                  Leave Feedback
                </button>
              </div>
            )}

            {fbError && <p className="text-red-600">{fbError}</p>}
          </div>
        )}

        {/* Redesigned Feedback Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg space-y-6">
              <h3 className="text-2xl font-bold text-center">Leave Feedback</h3>
              {formError && <p className="text-red-600 text-center">{formError}</p>}
              <div className="space-y-4">
                {/* Star ratings */}
                {[
                  { key: 'foodRating', label: 'Food' },
                  { key: 'serviceRating', label: 'Service' },
                  { key: 'cleanlinessRating', label: 'Cleanliness' },
                  { key: 'overallRating', label: 'Overall' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block font-medium mb-2">{label}</label>
                    <StarRating
                      value={form[key]}
                      onChange={val => setForm(f => ({ ...f, [key]: val }))}
                    />
                  </div>
                ))}

                {/* Comments */}
                {[
                  { key: 'foodComments', label: 'Food Comments' },
                  { key: 'serviceComments', label: 'Service Comments' },
                  { key: 'cleanlinessComments', label: 'Cleanliness Comments' },
                  { key: 'overallComments', label: 'Overall Comments' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block font-medium mb-1">{label}</label>
                    <textarea
                      rows={2}
                      value={form[key]}
                      onChange={e =>
                        setForm(f => ({ ...f, [key]: e.target.value }))
                      }
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-full border hover:bg-gray-100 transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFeedbackSubmit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
