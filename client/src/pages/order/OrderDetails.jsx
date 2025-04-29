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
import { FaSpinner } from 'react-icons/fa';
import autoTable from 'jspdf-autotable';

const libraries = ['places', 'geometry'];

export default function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder]                 = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [driverLoc, setDriverLoc]         = useState(null);
  const [driverInfo, setDriverInfo]       = useState(null);
  const [status, setStatus]               = useState('');
  const [directions, setDirections]       = useState(null);

  const lastComputeRef = useRef(0);
  const socketRef      = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    (async () => {
      try {
        let res = await fetch(`/api/orders/get/${orderId}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setOrder(data);
        setStatus(data.status);

        res = await fetch(`/api/payments/order/${orderId}`, { credentials: 'include' });
        const pay = await res.json();
        setPaymentStatus(res.ok ? pay.status : 'unknown');
      } catch (e) {
        console.error(e);
      }
    })();
  }, [orderId]);

  const loadDriverInfo = useCallback(async (driverId) => {
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

  useEffect(() => {
    if (!order?.driverId) return;
    fetch(`/api/drivers/get/${order.driverId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setDriverLoc({ lat: d.currentLocation.latitude, lng: d.currentLocation.longitude });
      })
      .catch(console.error);
    loadDriverInfo(order.driverId);
  }, [order?.driverId, loadDriverInfo]);

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
        setDriverLoc({ lat: payload.currentLocation.latitude, lng: payload.currentLocation.longitude });
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

  // ← Updated: now includes 'ready' so we still draw the path from driver → restaurant
  const computeRoute = useCallback(() => {
    if (!order || !driverLoc) return;
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

    const service = new window.google.maps.DirectionsService();
    service.route(
      { origin, destination, travelMode: 'DRIVING' },
      (result, stat) => {
        if (stat === 'OK') setDirections(result);
        else console.error('DirectionsService failed:', stat);
      }
    );
  }, [driverLoc, status, order]);

  useEffect(() => {
    if (isLoaded) computeRoute();
  }, [isLoaded, driverLoc, status, computeRoute]);

  if (loadError) return <p>Error loading map</p>;
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

  const restaurantPos = {
    lat: order.restaurant.location.latitude,
    lng: order.restaurant.location.longitude,
  };
  const deliveryPos = {
    lat: order.deliveryAddress.latitude,
    lng: order.deliveryAddress.longitude,
  };
  const mapCenter =
    status !== 'delivered' && driverLoc
      ? driverLoc
      : restaurantPos;

  // 7) Receipt generator
  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('CookingApp Receipt', 14, 22);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order._id}`, 14, 32);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 14, 38);
    doc.text(`Restaurant: ${order.restaurant.name}`, 14, 44);
    doc.text(`Address: ${order.restaurant.address}`, 14, 50);
    doc.text(`Payment: ${paymentStatus}`, 14, 56);
    doc.text(`Status: ${status.replace(/_/g,' ')}`, 14, 62);
    if (driverInfo) {
      doc.text(`Driver: ${driverInfo.username}`, 14, 68);
      doc.text(`Driver Phone: ${driverInfo.phoneNumber}`, 14, 74);
    }

    // Table of items
    const cols = ['Item', 'Qty', 'Unit Price', 'Total'];
    const rows = order.orderItems.map(it => [
      it.menuItemDetails.name,
      it.quantity.toString(),
      `₨ ${it.price.toFixed(2)}`,
      `₨ ${(it.price * it.quantity).toFixed(2)}`
    ]);

    autoTable(doc,{
      startY: 80,
      head: [cols],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    const subtotal = order.orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    doc.text(`Subtotal: ₨ ${subtotal.toFixed(2)}`, 14, finalY);
    doc.text(`Total: ₨ ${order.totalPrice.toFixed(2)}`, 14, finalY + 8);

    doc.save(`receipt_${order._id}.pdf`);
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
                paymentStatus === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
          >
            <Marker position={restaurantPos} icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png" />
            <Marker position={deliveryPos} icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png" />
            {status !== 'delivered' && driverLoc && (
              <Marker position={driverLoc} icon="http://maps.google.com/mapfiles/ms/icons/truck.png" />
            )}
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{ suppressMarkers: true, polylineOptions: { strokeWeight: 6 } }}
              />
            )}
          </GoogleMap>
        </div>

        {/* Details */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-2xl font-semibold">Details</h2>
          <p><strong>Restaurant:</strong> {order.restaurant.name}, {order.restaurant.address}</p>
          <p><strong>Delivery To:</strong> {order.deliveryAddress.address}</p>

          <h3 className="text-xl font-semibold mt-4">Items</h3>
          <ul className="divide-y">
            {order.orderItems.map(item => (
              <li key={item.menuItemId} className="py-2 flex justify-between">
                <span>{item.menuItemDetails.name} × {item.quantity}</span>
                <span>₨ {(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
