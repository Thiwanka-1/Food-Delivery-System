// src/pages/Checkout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import {
  useLoadScript,
  GoogleMap,
  Marker,
  Autocomplete,
} from '@react-google-maps/api';
import { FaSpinner, FaMapMarkerAlt } from 'react-icons/fa';

const libraries = ['places'];

// Haversine distance in km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Checkout() {
  const navigate = useNavigate();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loadingRest, setLoadingRest] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [address, setAddress] = useState('');
  const [deliveryLoc, setDeliveryLoc] = useState(null);
  const [distanceErr, setDistanceErr] = useState('');
  const [posting, setPosting] = useState(false);

  // Load currentOrder
  useEffect(() => {
    const raw = localStorage.getItem('currentOrder');
    if (!raw) {
      navigate('/cart');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setOrder(parsed);
    } catch {
      navigate('/cart');
    }
  }, [navigate]);

  // Fetch restaurant details
  useEffect(() => {
    if (!order) return;
    async function loadRest() {
      try {
        const res = await fetch(
          `/api/restaurants/getid/${order.restaurantId}`,
          { credentials: 'include' }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load restaurant');
        setRestaurant(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRest(false);
      }
    }
    loadRest();
  }, [order]);

  // fees calculation
  const subtotal = order
    ? order.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
    : 0;
  const serviceFee = parseFloat((subtotal * 0.05).toFixed(2));
  // delivery fee: ₨20 per km, min ₨50
  const deliveryFee =
    deliveryLoc && restaurant
      ? Math.max(50, Math.round(getDistanceKm(
          restaurant.location.latitude,
          restaurant.location.longitude,
          deliveryLoc.lat,
          deliveryLoc.lng
        ) * 20))
      : 0;
  const grandTotal = parseFloat((subtotal + serviceFee + deliveryFee).toFixed(2));

  // Autocomplete
  const autoRef = useRef();
  const onLoadAuto = ref => (autoRef.current = ref);
  const onPlaceChanged = () => {
    const place = autoRef.current.getPlace();
    if (!place.geometry) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setDeliveryLoc({ lat, lng });
    setAddress(place.formatted_address);
    setDistanceErr('');
  };

  // Map click
  const mapRef = useRef();
  const onMapLoad = map => (mapRef.current = map);
  const onMapClick = e => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setDeliveryLoc({ lat, lng });
    setAddress('');
    setDistanceErr('');
  };

  // Validate distance
  useEffect(() => {
    if (!deliveryLoc || !restaurant) return;
    const d = getDistanceKm(
      restaurant.location.latitude,
      restaurant.location.longitude,
      deliveryLoc.lat,
      deliveryLoc.lng
    );
    if (d > 10) {
      setDistanceErr('Delivery address must be within 10 km of restaurant');
    } else {
      setDistanceErr('');
    }
  }, [deliveryLoc, restaurant]);

  // Submit order
  const handleProceed = async () => {
    if (!deliveryLoc || distanceErr) return;
    setPosting(true);

    // 1) Reverse‐geocode if address blank
    let finalAddress = address.trim();
    if (!finalAddress && window.google && window.google.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const { results } = await geocoder.geocode({ location: deliveryLoc });
        finalAddress = results?.[0]?.formatted_address || '';
      } catch (e) {
        console.warn("Reverse geocode failed:", e);
      }
    }

    if (!finalAddress) {
      alert("Couldn't resolve an address. Please search or pick again.");
      setPosting(false);
      return;
    }

    // 2) Build & POST order
    const body = {
      orderItems: order.items.map(it => ({
        menuItemId: it.id,
        quantity: it.quantity,
        price: it.price,
      })),
      restaurantId: order.restaurantId,
      deliveryAddress: {
        address: finalAddress,
        latitude: deliveryLoc.lat,
        longitude: deliveryLoc.lng,
      },
      totalPrice: grandTotal,
    };

    try {
      const res = await fetch('/api/orders/add', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order creation failed');
      navigate(`/payment?orderId=${data._id}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-gray-500" />
        </main>
      </div>
    );
  }

  if (loadingRest || !restaurant) {
       return (
         <div className="flex min-h-screen bg-gray-50">
           <Sidebar />
           <main className="flex-1 p-8 flex items-center justify-center">
             <FaSpinner className="animate-spin text-4xl text-gray-500" />
           </main>
         </div>
       );
     }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        <h1 className="text-3xl font-bold">Checkout</h1>

        {/* Map & Location Picker */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row gap-6">
          <div className="relative md:w-2/3 h-64 md:h-96">
            <Autocomplete
              onLoad={onLoadAuto}
              onPlaceChanged={onPlaceChanged}
            >
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Delivery address…"
                className="absolute top-4 left-4 z-10 w-2/3 p-2 border rounded shadow"
              />
            </Autocomplete>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{
                lat: restaurant.location.latitude,
                lng: restaurant.location.longitude,
              }}
              zoom={12}
              onLoad={onMapLoad}
              onClick={onMapClick}
            >
              {deliveryLoc && <Marker position={deliveryLoc} />}
              {/* also show restaurant */}
              <Marker
                position={{
                  lat: restaurant.location.latitude,
                  lng: restaurant.location.longitude,
                }}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                }}
              />
            </GoogleMap>
          </div>

          <div className="md:w-1/3 flex flex-col justify-between">
            <h2 className="text-xl font-semibold mb-4">
              Delivery Location
            </h2>
            {distanceErr && (
              <p className="text-red-600 mb-4">{distanceErr}</p>
            )}
            <button
              onClick={() => {
                navigator.geolocation.getCurrentPosition(pos => {
                  const { latitude: lat, longitude: lng } = pos.coords;
                  setDeliveryLoc({ lat, lng });
                  setAddress('');
                  setDistanceErr('');
                  mapRef.current.panTo({ lat, lng });
                });
              }}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
            >
              <FaMapMarkerAlt />
              <span>Use My Location</span>
            </button>
            <button
              onClick={handleProceed}
              disabled={!deliveryLoc || distanceErr || posting}
              className={`w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center space-x-2 ${
                posting
                  ? 'opacity-70 cursor-not-allowed'
                  : 'hover:bg-green-700'
              }`}
            >
              {posting && <FaSpinner className="animate-spin" />}
              <span>
                {posting ? 'Placing Order…' : 'Proceed to Payment'}
              </span>
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Order Summary</h2>
          <div className="divide-y">
            {order.items.map(item => (
              <div
                key={item.id}
                className="flex items-center py-3 space-x-4"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-gray-600">
                    {item.quantity} × ₨ {item.price.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold">
                  ₨ {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Fees */}
          <div className="mt-6 space-y-2 text-right">
            <div>
              <span className="font-medium">Subtotal:</span>{' '}
              ₨ {subtotal.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Service Fee (5%):</span>{' '}
              ₨ {serviceFee.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Delivery Fee:</span>{' '}
              ₨ {deliveryFee.toFixed(2)}
            </div>
            <div className="text-xl font-bold">
              Grand Total: ₨ {grandTotal.toFixed(2)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
