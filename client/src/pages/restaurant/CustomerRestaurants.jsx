// src/pages/CustomerRestaurants.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import {
  useLoadScript,
  GoogleMap,
  Marker,
  Autocomplete,
} from '@react-google-maps/api';
import { FaSpinner, FaMapMarkerAlt, FaStar } from 'react-icons/fa';

const libraries = ['places'];

// Haversine distance (km)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CustomerRestaurants() {
  const navigate = useNavigate();

  // Picking state
  const [markerPos, setMarkerPos] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [error, setError] = useState('');

  // Restaurants state
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(false);

  // Autocomplete
  const autocompleteRef = useRef();
  const onLoadAuto = ref => (autocompleteRef.current = ref);
  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setMarkerPos({ lat, lng });
    setAddress(place.formatted_address);
    setError('');
  };

  // “Use my location”
  const handleUseCurrent = () => {
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMarkerPos({ lat, lng });
        setAddress('');
        setError('');
        setLoadingLoc(false);
      },
      () => {
        setError('Unable to get your location.');
        setLoadingLoc(false);
      }
    );
  };

  // Confirm & fetch restaurants
  const handleConfirm = () => {
    setLocation(markerPos);
  };

  // Fetch + filter once we have a confirmed location
  useEffect(() => {
    if (!location) return;
    setLoading(true);
    fetch('/api/restaurants/getall', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          setError(data.message || 'Failed to load restaurants');
          return;
        }
        const filtered = data
          .map(r => {
            const lat = r.location?.latitude;
            const lng = r.location?.longitude;
            if (lat == null || lng == null) return null;
            const distance = getDistanceKm(location.lat, location.lng, lat, lng);
            return { ...r, distance };
          })
          .filter(r => r && r.distance <= 10)
          .sort((a, b) => a.distance - b.distance);
        setNearby(filtered);
      })
      .catch(() => setError('Server error, please try again.'))
      .finally(() => setLoading(false));
  }, [location]);

  // Load Google Maps
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* LOCATION PICKER */}
        {!location ? (
          <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row gap-6">
            {/* Map + Search */}
            <div className="relative md:w-2/3 h-64 md:h-96">
              <Autocomplete onLoad={onLoadAuto} onPlaceChanged={onPlaceChanged}>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Search address..."
                  className="absolute top-4 left-4 z-10 w-2/3 p-2 border rounded shadow"
                />
              </Autocomplete>

              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={markerPos || { lat: 6.9271, lng: 79.8612 }}
                zoom={markerPos ? 15 : 12}
                onClick={e =>
                  setMarkerPos({ lat: e.latLng.lat(), lng: e.latLng.lng() })
                }
              >
                {markerPos && <Marker position={markerPos} />}
              </GoogleMap>
            </div>

            {/* Controls */}
            <div className="md:w-1/3 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-4">Select Your Location</h2>
              <p className="text-gray-600 mb-4">
                Search an address above, or click the map to place the pin.
              </p>
              {error && <p className="text-red-600 mb-4">{error}</p>}

              <button
                onClick={handleUseCurrent}
                disabled={loadingLoc}
                className="mb-3 inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingLoc && <FaSpinner className="animate-spin" />}
                <span>{loadingLoc ? 'Locating…' : 'Use My Current Location'}</span>
              </button>

              <button
                onClick={handleConfirm}
                disabled={!markerPos}
                className="inline-flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                <FaMapMarkerAlt />
                <span>Confirm Location</span>
              </button>
            </div>
          </div>
        ) : (
          /* RESTAURANT LIST */
          <>
            <h1 className="text-3xl font-bold mb-6">Restaurants Nearby</h1>
            {loading ? (
              <div className="flex justify-center py-20">
                <FaSpinner className="animate-spin text-4xl text-gray-500" />
              </div>
            ) : nearby.length === 0 ? (
              <p className="text-gray-600">No restaurants found within 10 km.</p>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {nearby.map(r => (
                  <div
                    key={r._id}
                    onClick={() => navigate(`/restaurants/${r._id}/menu`)}
                    className="cursor-pointer bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex flex-col"
                  >
                    <span
                      className={`self-end px-3 py-1 text-sm font-semibold rounded-full ${
                        r.isAvailable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {r.isAvailable ? 'Open' : 'Closed'}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-800 my-2">{r.name}</h2>
                    <p className="text-gray-600 flex-1">{r.address}</p>
                    <div className="flex items-center justify-between mt-4 text-gray-600">
                      <span className="flex items-center space-x-1">
                        <FaStar className="text-yellow-500" />
                        <span>{r.rating != null ? r.rating.toFixed(1) : '—'}</span>
                      </span>
                      <span className="text-sm font-medium">
                        {r.distance.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
