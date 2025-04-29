// src/components/Header.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from './logo3.png'; // ← point this at your logo file

export default function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role'); // 'admin' | 'driver' | 'owner' | 'user'
  const [profilePic, setProfilePic] = useState(
    localStorage.getItem('profilePicUrl') ||
      'https://static.vecteezy.com/system/resources/previews/013/215/160/non_2x/picture-profile-icon-male-icon-human-or-people-sign-and-symbol-vector.jpg'
  );

  // Listen for changes to profilePicUrl in localStorage
  useEffect(() => {
    const handleStorage = e => {
      if (e.key === 'profilePicUrl' && e.newValue) {
        setProfilePic(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const goToProfile = () => {
    switch (role) {
      case 'admin':
        return navigate('/admin/profile');
      case 'driver':
        return navigate('/driver/profile');
      case 'owner':
        return navigate('/owner/profile');
      default:
        return navigate('/profile');
    }
  };

  return (
    <header className="bg-white border-b shadow-sm px-10 flex justify-between items-center">
      {/* Logo / App Name */}
      <Link to="/">
        <img src={logo} alt="Quick Eats" className="h-24" />
      </Link>

      {/* Nav buttons */}
      <nav className="flex items-center space-x-4">
        {!token ? (
          <>
            <Link
              to="/signin"
              className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Sign Up
            </Link>
          </>
        ) : (
          <button
            onClick={goToProfile}
            className="flex items-center focus:outline-none"
          >
            <img
              src={profilePic}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
            />
          </button>
        )}
      </nav>
    </header>
  );
}
