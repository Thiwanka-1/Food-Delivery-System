// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// allowedRoles: array of roles e.g. ['admin','owner']
export default function PrivateRoute({ allowedRoles = [] }) {
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');  // you must store role on login

  // Not logged in?
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // No role match?
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Otherwise render child routes
  return <Outlet />;
}
