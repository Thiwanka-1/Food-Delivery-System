// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaUsers,
  FaShoppingCart,
  FaSearch,
  FaStore,
  FaPlus,
  FaClipboardList,
  FaTruck,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaUserPlus,
} from 'react-icons/fa';

export default function Sidebar() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const [role, setRole] = useState(null);
  const [open, setOpen] = useState(false);

  // 1) fetch user role
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(u => {
        if (u.role) setRole(u.role);
      })
      .catch(() => {});
  }, [userId]);

  // 2) build menu by role
  let menu = [];
  if (role === 'admin') {
    menu = [
      { to: '/admin/profile',       label: 'Profile',       icon: FaUser },
      { to: '/admin/users',         label: 'Users',         icon: FaUsers },
      { to: '/admin/adduser',       label: 'Add User',      icon: FaUserPlus },
    ];
  } else if (role === 'owner') {
    menu = [
      { to: '/owner/profile',       label: 'Profile',         icon: FaUser },
      { to: '/restaurants/my',      label: 'My Restaurants',  icon: FaStore },
      { to: '/restaurants/add',     label: 'Add Restaurant',  icon: FaPlus },
      { to: '/orders/owner',        label: 'Orders',          icon: FaClipboardList },
    ];
  } else if (role === 'driver') {
    menu = [
      { to: '/driver/profile',      label: 'Profile',         icon: FaUser },
      { to: '/driver/orders',       label: 'My Deliveries',   icon: FaTruck },
    ];
  } else {
    // default = customer
    menu = [
      { to: '/restaurants/customer', label: 'Find Restaurants', icon: FaSearch },
      { to: '/orders/my',            label: 'My Orders',        icon: FaShoppingCart },
      { to: '/profile',              label: 'Profile',          icon: FaUser },
    ];
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate('/signin');
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="p-4 md:hidden fixed top-0 left-0 z-50 text-gray-700"
        onClick={() => setOpen(true)}
      >
        <FaBars size={24} />
      </button>

      {/* overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden ${
          open ? 'block' : 'hidden'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* sidebar/drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-white border-r shadow-lg z-50
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:flex md:flex-col
        `}
      >
        {/* close on mobile */}
        <div className="flex md:hidden justify-end p-4">
          <button onClick={() => setOpen(false)}>
            <FaTimes size={24} />
          </button>
        </div>

        <div className="p-6 text-2xl font-bold text-blue-600">CookingApp</div>

        <nav className="flex-1 px-4">
          {menu.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center p-3 my-1 rounded ${
                  isActive
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="mr-3" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center p-3 m-4 text-red-600 hover:bg-red-50 rounded"
        >
          <FaSignOutAlt className="mr-3" /> Logout
        </button>
      </aside>
    </>
  );
}
