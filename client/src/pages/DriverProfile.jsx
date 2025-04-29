// src/pages/DriverProfile.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  useLoadScript,
  GoogleMap,
  Marker,
  Autocomplete,
} from '@react-google-maps/api';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { FaSpinner } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';

const libraries = ['places'];

export default function DriverProfile() {
  const userId = localStorage.getItem('userId');
  const [driver, setDriver] = useState(null);
  const [user, setUser]     = useState({
    username: '',
    email: '',
    phoneNumber: '',
    profilePicture: '',
    bio: '',
  });

  // profile form
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile]                 = useState(null);
  const [preview, setPreview]           = useState(null);
  const [errors, setErrors]             = useState({});
  const [message, setMessage]           = useState('');

  // location chooser
  const [address, setAddress]    = useState('');
  const [markerPos, setMarkerPos]= useState(null);
  const [locLoading, setLocLoading]   = useState(false);
  const [locError, setLocError]       = useState('');
  const [locMessage, setLocMessage]   = useState('');
  const [geoLoading, setGeoLoading]   = useState(false);
  const [geoError, setGeoError]       = useState('');

  const autoRef = useRef();
  const mapRef  = useRef();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // set refs
  const onAutoLoad = ref => (autoRef.current = ref);
  const onMapLoad  = map => (mapRef.current = map);

  const onPlaceChanged = () => {
    const place = autoRef.current.getPlace();
    if (!place.geometry) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setMarkerPos({ lat, lng });
    setAddress(place.formatted_address);
    mapRef.current.panTo({ lat, lng });
    setLocError('');
    setLocMessage('');
  };

  const onMapClick = e => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    setAddress('');
    setLocError('');
    setLocMessage('');
  };

  // 1) load user profile
  useEffect(() => {
    fetch(`/api/user/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.username) {
          setUser({
            username: d.username,
            email: d.email,
            phoneNumber: d.phoneNumber || '',
            profilePicture: d.profilePicture || '',
            bio: d.bio || '',
          });
        } else {
          setMessage(d.message || 'Failed to load profile');
        }
      })
      .catch(() => setMessage('Failed to load profile'));
  }, [userId]);

  // 2) load driver record by userId
  useEffect(() => {
    fetch(`/api/drivers/user/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d._id) {
          setDriver(d);
          if (d.currentLocation) {
            setMarkerPos({
              lat: d.currentLocation.latitude,
              lng: d.currentLocation.longitude,
            });
          }
        }
      })
      .catch(() => {
        /* no driver yet */
      });
  }, [userId]);

  // validation
  const validate = (field, val) => {
    if (field === 'username' && !val) return 'Username is required';
    if (field === 'email') {
      if (!val) return 'Email is required';
      if (!/\S+@\S+\.\S+/.test(val)) return 'Invalid email';
    }
    return '';
  };
  const handleBlur   = e => {
    const err = validate(e.target.name, e.target.value);
    setErrors(prev => ({ ...prev, [e.target.name]: err }));
  };
  const handleChange = e => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setMessage('');
  };
  const handleFile = e => {
    const f = e.target.files[0];
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  // submit profile form
  const handleSubmit = async e => {
    e.preventDefault();
    const newErrs = {};
    ['username','email'].forEach(f => {
      const err = validate(f, user[f]);
      if (err) newErrs[f] = err;
    });
    if (Object.keys(newErrs).length) {
      setErrors(newErrs);
      return;
    }
    try {
      let picUrl = user.profilePicture;
      if (file) {
        const storage = getStorage(app);
        const storageRef = ref(storage, `profiles/${userId}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        picUrl = await getDownloadURL(storageRef);
      }
      const body = {
        username: user.username,
        email:    user.email,
        phoneNumber: user.phoneNumber,
        profilePicture: picUrl,
        ...(password ? { password } : {}),
      };
      const res = await fetch(`/api/user/update/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.message || 'Update failed');
      else {
        setMessage('Profile updated successfully');
        setUser(prev => ({ ...prev, profilePicture: picUrl }));
        setPassword('');
      }
    } catch {
      setMessage('Server error, please try again');
    }
  };

  // get device location
  const getCurrentLocation = () => {
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarkerPos({ lat, lng });
        setAddress('');
        mapRef.current && mapRef.current.panTo({ lat, lng });
        setGeoLoading(false);
      },
      () => {
        setGeoError('Unable to fetch location');
        setGeoLoading(false);
      }
    );
  };

  // save to backend
  const saveLocation = async () => {
    if (!markerPos || !driver?._id) {
      setLocError('Please pick or detect your location');
      return;
    }
    setLocLoading(true);
    setLocError('');
    try {
      const res = await fetch(`/api/drivers/${driver._id}/location`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          latitude:  markerPos.lat,
          longitude: markerPos.lng
        }),
      });
      const data = await res.json();
      if (!res.ok) setLocError(data.message || 'Could not save location');
      else setLocMessage('Location updated!');
    } catch {
      setLocError('Server error, try again');
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        <h1 className="text-3xl font-semibold">Driver Profile</h1>

        {message && (
          <div className="p-3 bg-green-100 text-green-800 rounded">{message}</div>
        )}

        {/* PROFILE FORM */}
        <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto space-y-6">
          <div className="flex justify-center">
            <label className="relative cursor-pointer">
              <img
                src={
                  preview ||
                  user.profilePicture ||
                  'https://static.vecteezy.com/system/resources/previews/013/215/160/non_2x/picture-profile-icon-male-icon-human-or-people-sign-and-symbol-vector.jpg'
                }
                className="w-28 h-28 rounded-full border-4 border-blue-600 object-cover shadow"
                alt="avatar"
              />
              <input
                type="file"
                className="absolute inset-0 opacity-0"
                onChange={handleFile}
              />
            </label>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block font-medium text-gray-700">
                  Username
                </label>
                <input
                  name="username"
                  value={user.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 w-full p-2 border rounded ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                )}
              </div>
              <div>
                <label className="block font-medium text-gray-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={user.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 w-full p-2 border rounded ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Phone Number
              </label>
              <input
                name="phoneNumber"
                type="tel"
                value={user.phoneNumber}
                onChange={handleChange}
                className="mt-1 w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="relative">
              <label className="block font-medium text-gray-700">
                New Password (optional)
              </label>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 rounded"
                placeholder="Leave blank to keep unchanged"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-10 text-gray-500"
              >
                {showPassword ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
            >
              Save Profile
            </button>
          </form>
        </div>

        {/* LOCATION PICKER */}
        <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto space-y-4">
          <h2 className="text-xl font-semibold">Update Your Location</h2>

          {loadError && <p className="text-red-600">Error loading map</p>}
          {!isLoaded ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin text-gray-500 text-3xl" />
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <Autocomplete onLoad={onAutoLoad} onPlaceChanged={onPlaceChanged}>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Search address…"
                    className="flex-1 p-2 border rounded"
                  />
                </Autocomplete>
                <button
                  onClick={getCurrentLocation}
                  disabled={geoLoading}
                  className="px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {geoLoading ? <FaSpinner className="animate-spin" /> : 'Use My Location'}
                </button>
              </div>
              {geoError && <p className="text-red-600 text-sm">{geoError}</p>}

              <div className="h-64 w-full mb-2">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={markerPos || { lat: 6.9271, lng: 79.8612 }}
                  zoom={markerPos ? 15 : 5}
                  onLoad={onMapLoad}
                  onClick={onMapClick}
                >
                  {markerPos && <Marker position={markerPos} />}
                </GoogleMap>
              </div>

              {locError && <p className="text-red-600 text-sm">{locError}</p>}
              {locMessage && <p className="text-green-600 text-sm">{locMessage}</p>}

              <button
                onClick={saveLocation}
                disabled={locLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {locLoading ? <FaSpinner className="animate-spin mx-auto" /> : 'Save Location'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
