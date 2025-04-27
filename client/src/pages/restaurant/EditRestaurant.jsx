// src/pages/EditRestaurant.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import {
  useLoadScript,
  GoogleMap,
  Marker,
  Autocomplete,
} from '@react-google-maps/api';

const libraries = ['places'];

export default function EditRestaurant() {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [markerPos, setMarkerPos] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const mapRef = useRef();
  const onMapLoad = useCallback(map => (mapRef.current = map), []);

  const autocompleteRef = useRef();
  const onAutocompleteLoad = ref => (autocompleteRef.current = ref);
  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry) return;
    const latitude = place.geometry.location.lat();
    const longitude = place.geometry.location.lng();
    setMarkerPos({ lat: latitude, lng: longitude });
    setForm(f => ({
      ...f,
      address: place.formatted_address,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
    mapRef.current.panTo({ lat: latitude, lng: longitude });
    setErrors(prev => ({ ...prev, location: '' }));
  };

  // Load existing restaurant
  useEffect(() => {
    fetch(`/api/restaurants/getid/${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data._id) {
          setForm({
            name: data.name,
            address: data.address,
            contact: data.contact,
            isAvailable: data.isAvailable,
            latitude: data.location?.latitude?.toFixed(6) || '',
            longitude: data.location?.longitude?.toFixed(6) || '',
          });
          if (data.location?.latitude && data.location?.longitude) {
            setMarkerPos({
              lat: data.location.latitude,
              lng: data.location.longitude,
            });
          }
        } else {
          setMessage(data.message || 'Restaurant not found');
        }
      })
      .catch(() => setMessage('Failed to load restaurant'));
  }, [id]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.contact.trim()) errs.contact = 'Contact is required';
    if (!form.latitude || !form.longitude) errs.location = 'Location is required';
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

    try {
      const res = await fetch(`/api/restaurants/update/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to update');
      } else {
        setMessage('Restaurant updated!');
        setTimeout(() => navigate('/restaurants/my'), 1000);
      }
    } catch {
      setMessage('Server error, please try again.');
    }
  };

  if (loadError) return <div>Error loading map</div>;
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <button
          onClick={() => navigate(-1)}
          className="text-indigo-600 hover:underline mb-4"
        >
          &larr; Back
        </button>
        <h1 className="text-3xl font-semibold mb-6">Edit Restaurant</h1>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>
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
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Address */}
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
                />
              </Autocomplete>
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">{errors.address}</p>
              )}
            </div>

            {/* Map */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">Pick Location</label>
              <div className="h-64 w-full">
                <GoogleMap
                  onLoad={onMapLoad}
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={
                    markerPos || { lat: 6.9271, lng: 79.8612 }
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
                className="h-4 w-4 text-blue-600"
              />
              <label className="text-gray-700">Open for orders</label>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
            >
              Save Changes
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
