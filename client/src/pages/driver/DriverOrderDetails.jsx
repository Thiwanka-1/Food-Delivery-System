// src/pages/DriverOrderDetails.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import {
  useLoadScript,
  GoogleMap,
  Marker,
  DirectionsRenderer
} from "@react-google-maps/api";
import { io } from "socket.io-client";
import { FaSpinner } from "react-icons/fa";

const libraries = ["geometry"];

export default function DriverOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [status, setStatus] = useState("");
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const socketRef = useRef();
  const lastCompute = useRef(0);

  // 1️⃣ Load order + initial driver location
  useEffect(() => {
    (async () => {
      try {
        // Fetch the order
        const oRes = await fetch(`/api/orders/get/${orderId}`, {
          credentials: "include"
        });
        const oData = await oRes.json();
        if (!oRes.ok) throw new Error(oData.message || "Failed to load order");
        setOrder(oData);
        setStatus(oData.status);

        // If the order has a driverId, fetch that driver
        if (oData.driverId) {
          const dRes = await fetch(`/api/drivers/get/${oData.driverId}`, {
            credentials: "include"
          });
          const dData = await dRes.json();
          if (dRes.ok && dData.currentLocation) {
            setDriverLoc({
              lat: dData.currentLocation.latitude,
              lng: dData.currentLocation.longitude
            });
          }
        }
      } catch (e) {
        console.error("Failed to load order or driver:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // 2️⃣ Socket.IO live updates
  useEffect(() => {
    const socket = io("http://localhost:8081", {
      transports: ["websocket"],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on("driverLocationUpdate", payload => {
      if (payload.orderId === orderId) {
        setDriverLoc({
          lat: payload.latitude,
          lng: payload.longitude
        });
      }
    });
    socket.on("orderPickedUp", payload => {
      if (payload.orderId === orderId) setStatus("picked_up");
    });
    socket.on("orderDelivered", payload => {
      if (payload.orderId === orderId) setStatus("delivered");
    });

    return () => socket.disconnect();
  }, [orderId]);

  // 3️⃣ Google Maps & route compute
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });
  const computeRoute = useCallback(() => {
    if (!order || !driverLoc || !window.google) return;
    const now = Date.now();
    if (now - lastCompute.current < 5000) return;
    lastCompute.current = now;

    let origin = driverLoc;
    let dest =
      status === "driver_assigned"
        ? {
            lat: order.restaurant.location.latitude,
            lng: order.restaurant.location.longitude
          }
        : {
            lat: order.deliveryAddress.latitude,
            lng: order.deliveryAddress.longitude
          };

    new window.google.maps.DirectionsService().route(
      {
        origin,
        destination: dest,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, s) => {
        if (s === "OK") setDirections(result);
      }
    );
  }, [order, driverLoc, status]);
  useEffect(() => {
    if (isLoaded) computeRoute();
  }, [isLoaded, computeRoute]);

  if (loading || !order) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-gray-500" />
        </main>
      </div>
    );
  }

  if (loadError) return <p>Error loading map</p>;

  const restaurantPos = {
    lat: order.restaurant.location.latitude,
    lng: order.restaurant.location.longitude
  };
  const deliveryPos = {
    lat: order.deliveryAddress.latitude,
    lng: order.deliveryAddress.longitude
  };
  const mapCenter = driverLoc || restaurantPos;

  // 4️⃣ Confirm pickup
  const handleConfirmPickup = async () => {
    setPickupLoading(true);
    try {
      const res = await fetch("/api/drivers/confirm-pickup", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setStatus("picked_up");
    } catch (e) {
      alert(e.message);
    } finally {
      setPickupLoading(false);
    }
  };

  // 5️⃣ Confirm delivery
  const handleConfirmDelivery = async () => {
    setDeliveryLoading(true);
    try {
      const res = await fetch("/api/drivers/confirm-delivery", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setStatus("delivered");
    } catch (e) {
      alert(e.message);
    } finally {
      setDeliveryLoading(false);
    }
  };

  // 6️⃣ Open in Google Maps
  const openInMaps = () => {
    if (!driverLoc) return;
    const dest =
      status === "driver_assigned"
        ? restaurantPos
        : deliveryPos;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${driverLoc.lat},${driverLoc.lng}&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="text-indigo-600 hover:underline"
        >
          &larr; Back
        </button>
        <h1 className="text-3xl font-bold">Order #{order._id}</h1>
        <p className="text-gray-600">Restaurant: {order.restaurant.name}</p>
        <p className="text-gray-600">Deliver to: {order.deliveryAddress.address}</p>
        <span
          className={`px-3 py-1 inline-block rounded-full text-sm font-semibold ${
            status === 'driver_assigned' ? 'bg-blue-100 text-blue-800' :
            status === 'picked_up'       ? 'bg-indigo-100 text-indigo-800' :
            status === 'delivered'       ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}
        >
          {status.replace(/_/g, " ")}
        </span>

        {/* Map */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-80">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={13}
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

        {/* Actions */}
        <div className="space-x-4">
          {status === "driver_assigned" && (
            <button
              onClick={handleConfirmPickup}
              disabled={pickupLoading}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {pickupLoading ? "…" : "Confirm Pickup"}
            </button>
          )}
          {status === "picked_up" && (
            <button
              onClick={handleConfirmDelivery}
              disabled={deliveryLoading}
              className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {deliveryLoading ? "…" : "Confirm Delivery"}
            </button>
          )}
          <button
            onClick={openInMaps}
            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
            disabled={!driverLoc}
          >
            Open in Maps
          </button>
        </div>

        {/* Items */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">Items</h2>
          <ul className="divide-y">
            {order.orderItems.map(it => (
              <li key={it.menuItemId} className="py-2 flex justify-between">
                <span>{it.menuItemDetails.name} × {it.quantity}</span>
                <span>₨ {(it.price * it.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
