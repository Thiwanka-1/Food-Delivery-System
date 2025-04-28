// src/pages/OrderDetails.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { io } from 'socket.io-client';
import {
  useLoadScript,
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
} from '@react-google-maps/api';
import { FaSpinner } from 'react-icons/fa';

const libraries = ['places', 'geometry'];

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate   = useNavigate();
  const [order, setOrder]             = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [driverLoc, setDriverLoc]     = useState(null);
  const [status, setStatus]           = useState('');
  const [directions, setDirections]   = useState(null);
  const [mapRef, setMapRef]           = useState(null);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // 1) Fetch Order & Payment
  useEffect(() => {
    async function load() {
      try {
        // Order details (includes restaurant & enriched items)
        let res = await fetch(`/api/orders/get/${orderId}`, {
          credentials: 'include'
        });
        const orderData = await res.json();
        if (!res.ok) throw new Error(orderData.message);
        setOrder(orderData);
        setStatus(orderData.status);

        // Payment status
        res = await fetch(`/api/payments/order/${orderId}`, {
          credentials: 'include'
        });
        const payData = await res.json();
        if (res.ok) setPaymentStatus(payData.status);
        else setPaymentStatus('unknown');
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [orderId]);

  // 2) Fetch initial driver location
  useEffect(() => {
    if (!order?.driverId) return;
    fetch(`/api/drivers/get/${order.driverId}`)
      .then(res => res.json())
      .then(driver => {
        setDriverLoc({
          lat: driver.currentLocation.latitude,
          lng: driver.currentLocation.longitude
        });
      })
      .catch(console.error);
  }, [order?.driverId]);

  // 3) Subscribe to Socket.IO
  useEffect(() => {
    const socket = io(); // adjust URL if needed
    socket.on('driverAssigned', payload => {
      if (payload.orderId === orderId) {
        setDriverLoc({
          lat: payload.currentLocation.latitude,
          lng: payload.currentLocation.longitude
        });
        setStatus('driver_assigned');
      }
    });
    socket.on('driverLocationUpdate', payload => {
      if (payload.orderId === orderId) {
        setDriverLoc({
          lat: payload.latitude,
          lng: payload.longitude
        });
      }
    });
    socket.on('orderPickedUp', payload => {
      if (payload.orderId === orderId) setStatus('picked_up');
    });
    socket.on('orderDelivered', payload => {
      if (payload.orderId === orderId) setStatus('delivered');
    });
    return () => socket.disconnect();
  }, [orderId]);

  // 4) Compute directions when driver or status changes
  const computeRoute = useCallback(() => {
    if (!driverLoc || !order) return;

    const origin      = driverLoc;
    const dest        = status === 'picked_up'
      ? { lat: order.deliveryAddress.latitude, lng: order.deliveryAddress.longitude }
      : { lat: order.restaurant.location.latitude, lng: order.restaurant.location.longitude };

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin,
        destination: dest,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status_) => {
        if (status_ === 'OK') setDirections(result);
        else console.error('Directions error:', status_);
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
        <Sidebar/>
        <main className="flex-1 p-8 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-gray-500"/>
        </main>
      </div>
    );
  }

  const restaurantPos = {
    lat: order.restaurant.location.latitude,
    lng: order.restaurant.location.longitude
  };
  const deliveryPos = {
    lat: order.deliveryAddress.latitude,
    lng: order.deliveryAddress.longitude
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar/>
      <main className="flex-1 p-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <h1 className="text-3xl font-bold">Order #{order._id}</h1>
          <div className="space-x-2">
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

        {/* Map */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-96">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={restaurantPos}
            zoom={12}
            onLoad={map => setMapRef(map)}
          >
            <Marker position={restaurantPos} label="R" />
            <Marker position={deliveryPos} label="D" />
            {driverLoc && <Marker position={driverLoc} label="🚚" />}
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
          <p>
            <strong>Restaurant:</strong> {order.restaurant.name},{' '}
            {order.restaurant.address}
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
      </main>
    </div>
  );
}
