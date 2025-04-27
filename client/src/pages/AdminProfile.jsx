// src/pages/AdminProfile.jsx
import React, { useEffect, useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import Sidebar from '../components/Sidebar';

export default function AdminProfile() {
  const userId = localStorage.getItem('userId');
  const [user, setUser] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    profilePicture: '',
    bio: '',
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/user/${userId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.username) {
          setUser({
            username: data.username,
            email: data.email,
            phoneNumber: data.phoneNumber || '',
            profilePicture: data.profilePicture || '',
            bio: data.bio || '',
          });
        } else {
          setMessage(data.message || 'Failed to load profile');
        }
      })
      .catch(() => setMessage('Failed to load profile'));
  }, [userId]);

  const validate = (field, val) => {
    if (field === 'username' && !val) return 'Username is required';
    if (field === 'email') {
      if (!val) return 'Email is required';
      if (!/\S+@\S+\.\S+/.test(val)) return 'Invalid email';
    }
    return '';
  };

  const handleBlur = e => {
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

  const handleSubmit = async e => {
    e.preventDefault();
    const newErrs = {};
    ['username', 'email'].forEach(f => {
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
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePicture: picUrl,
        ...(password ? { password } : {}),
      };

      const res = await fetch(`/api/user/update/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Update failed');
      } else {
        setMessage('Profile updated successfully');
        setUser(prev => ({ ...prev, profilePicture: picUrl }));
        setPassword('');
      }
    } catch {
      setMessage('Server error, please try again');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account?')) return;
    try {
      const res = await fetch(`/api/user/delete/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        localStorage.clear();
        window.location.href = '/signin';
      } else {
        const data = await res.json();
        setMessage(data.message || 'Delete failed');
      }
    } catch {
      setMessage('Server error, please try again');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-semibold mb-6">Admin Profile</h1>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            {message}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto space-y-6">
          <div className="flex justify-center">
            <label className="relative cursor-pointer">
              <img
                src={preview || user.profilePicture || 
                  'https://static.vecteezy.com/system/resources/previews/013/215/160/non_2x/picture-profile-icon-male-icon-human-or-people-sign-and-symbol-vector.jpg'}
                className="w-28 h-28 rounded-full border-4 border-blue-600 object-cover shadow"
                alt="avatar"
              />
              <input type="file" className="absolute inset-0 opacity-0" onChange={handleFile} />
            </label>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block font-medium text-gray-700">Username</label>
                <input
                  name="username"
                  value={user.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 w-full p-2 border rounded ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
              </div>
              <div>
                <label className="block font-medium text-gray-700">Email</label>
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
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700">Phone Number</label>
              <input
                name="phoneNumber"
                type="tel"
                value={user.phoneNumber}
                onChange={handleChange}
                className="mt-1 w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="relative">
              <label className="block font-medium text-gray-700">New Password (optional)</label>
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
              Save Changes
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold"
            >
              Delete Account
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
