// src/pages/AdminAddUser.jsx
import React, { useState } from 'react'
import Sidebar from '../components/Sidebar'
import { FaSpinner } from 'react-icons/fa'

export default function AdminAddUser() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'owner'
  })
  const [errors, setErrors] = useState({})
  const [serverMsg, setServerMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required'
    return e
  }

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(err => ({ ...err, [name]: '' }))
    setServerMsg('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const eerrs = validate()
    if (Object.keys(eerrs).length) {
      setErrors(eerrs)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
          phoneNumber: form.phoneNumber
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setServerMsg(data.message || 'Failed to create user')
      } else {
        setServerMsg(`✅ ${form.role.charAt(0).toUpperCase()+form.role.slice(1)} created!`)
        setForm({
          username: '',
          email: '',
          password: '',
          phoneNumber: '',
          role: 'owner'
        })
      }
    } catch {
      setServerMsg('Server error, please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-semibold mb-6">Admin: Add Owner / Driver</h1>

        {serverMsg && (
          <div className="mb-4 text-center text-sm font-medium text-gray-700">
            {serverMsg}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block font-medium text-gray-700">Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className={`mt-1 w-full p-2 border rounded ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block font-medium text-gray-700">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`mt-1 w-full p-2 border rounded ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block font-medium text-gray-700">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className={`mt-1 w-full p-2 border rounded ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block font-medium text-gray-700">Phone Number</label>
              <input
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                className={`mt-1 w-full p-2 border rounded ${
                  errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block font-medium text-gray-700">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="mt-1 w-full p-2 border border-gray-300 rounded"
              >
                <option value="owner">Owner</option>
                <option value="driver">Driver</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Create User'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
