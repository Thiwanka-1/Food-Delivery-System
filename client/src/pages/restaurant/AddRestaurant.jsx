// src/pages/AddRestaurant.jsx
import React, { useState, useCallback, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import {
  useLoadScript,
  GoogleMap,
  Marker,
  Autocomplete,
} from '@react-google-maps/api';
import { FaSpinner } from 'react-icons/fa';

const libraries = ['places'];

export default function AddRestaurant() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [form, setForm] = useState({
    name: '',
    address: '',
    contact: '',
    isAvailable: true,
    latitude: '',
    longitude: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const mapRef = useRef();
  const onMapLoad = useCallback(map => (mapRef.current = map), []);
  const [markerPos, setMarkerPos] = useState(null);

  // Autocomplete ref
  const autocompleteRef = useRef();
  const onAutocompleteLoad = ref => (autocompleteRef.current = ref);
  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry) return;
    const { lat, lng } = place.geometry.location;
    const latitude = lat();
    const longitude = lng();
    setMarkerPos({ lat: latitude, lng: longitude });
    setForm(f => ({
      ...f,
      address: place.formatted_address,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
    mapRef.current.panTo({ lat: latitude, lng: longitude });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.contact.trim()) errs.contact = 'Contact is required';
    if (!form.latitude || !form.longitude) errs.location = 'Pick a location on the map';
    return errs;
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setMessage('');
  };

  const handleMapClick = e => {
    const latitude = e.latLng.lat();
    const longitude = e.latLng.lng();
    setMarkerPos({ lat: latitude, lng: longitude });
    setForm(f => ({
      ...f,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
    setErrors(prev => ({ ...prev, location: '' }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/restaurants/add', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setMessage(err.message || 'Failed to add restaurant.');
      } else {
        setMessage('Restaurant added successfully!');
        setForm({
          name: '',
          address: '',
          contact: '',
          isAvailable: true,
          latitude: '',
          longitude: '',
        });
        setMarkerPos(null);
      }
    } catch {
      setMessage('Server error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-semibold mb-6">Add New Restaurant</h1>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            {message}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Restaurant name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Address + Autocomplete */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Address</label>
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
              >
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Search address…"
                />
              </Autocomplete>
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
            </div>

            {/* Map picker */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Pick on Map
              </label>
              <div className="h-64 w-full">
                <GoogleMap
                  onLoad={onMapLoad}
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={
                    markerPos || { lat: 6.9271, lng: 79.8612 } // default to Colombo
                  }
                  zoom={markerPos ? 15 : 5}
                  onClick={handleMapClick}
                >
                  {markerPos && <Marker position={markerPos} />}
                </GoogleMap>
              </div>
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location}</p>
              )}
            </div>

            {/* Hidden coords */}
            <input type="hidden" name="latitude" value={form.latitude} />
            <input type="hidden" name="longitude" value={form.longitude} />

            {/* Contact */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Contact</label>
              <input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${
                  errors.contact ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+1 234 567 890"
              />
              {errors.contact && (
                <p className="text-red-500 text-xs mt-1">{errors.contact}</p>
              )}
            </div>

            {/* Availability */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isAvailable"
                checked={form.isAvailable}
                onChange={handleChange}
                id="availableToggle"
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="availableToggle" className="text-gray-700">
                Open for orders right now
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center py-2 rounded-lg font-semibold ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading && <FaSpinner className="animate-spin mr-2" />}
              <span>{loading ? 'Creating…' : 'Create Restaurant'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
