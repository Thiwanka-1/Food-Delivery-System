// src/pages/SignIn.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import { HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

export default function SignIn() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name, value) => {
    if (!value) return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) return 'Invalid email address';
    if (name === 'password' && value.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleBlur = e => {
    const { name, value } = e.target;
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // client-side validation
    const newErrors = {};
    Object.keys(form).forEach(key => {
      const err = validateField(key, form[key]);
      if (err) newErrors[key] = err;
    });
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      // sign in, include cookie
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message || JSON.stringify(data));
        return;
      }

      // store returned info
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('email', data.email);
      localStorage.setItem('role', data.role);
      localStorage.setItem('profilePicUrl', data.profilePicture || '');
      localStorage.setItem('userId', data._id);
      // fetch “me” using cookie
     
      // redirect based on role
      switch (data.role) {
        case 'admin':
          navigate('/admin/profile');
          break;
        case 'driver':
          navigate('/driver/profile');
          break;
        case 'owner':
          navigate('/owner/profile');
          break;
        default:
          navigate('/profile');
      }
    } catch (err) {
      console.error(err);
      setServerError('Server error, please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left image */}
      

      {/* Right form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100 p-4">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-3xl font-bold mb-6 text-center">Sign In</h2>

          {serverError && (
            <div className="mb-4 text-red-600 text-sm text-center">{serverError}</div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="flex items-center text-gray-700 mb-1">
              <FaEnvelope className="mr-2" /> Email
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full p-2 border rounded ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="mb-6 relative">
            <label className="flex items-center text-gray-700 mb-1">
              <HiLockClosed className="mr-2" /> Password
            </label>
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full p-2 border rounded ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-9 text-gray-500"
            >
              {showPassword ? <HiEyeOff /> : <HiEye />}
            </button>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
          >
            Sign In
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
      <div
        className="hidden md:block md:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://img.freepik.com/free-photo/chef-cooking-spaghetti-kitchen_53876-22994.jpg?t=st=1745328890~exp=1745332490~hmac=1b292ea9b2f3285d41279d8d9bfecc3a20214dcdd0c298606d38d330ede3c613&w=740')"
        }}
      />
    </div>
  );
}
