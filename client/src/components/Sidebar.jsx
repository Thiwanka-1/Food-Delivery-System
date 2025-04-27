import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaBook,
  FaVideo,
  FaQuestionCircle,
  FaUsers,
  FaSignOutAlt,
} from 'react-icons/fa';

export default function Sidebar({ isAdmin = false }) {
  const navigate = useNavigate();
  const menu = isAdmin
    ? [
        { to: '/admin/profile', label: 'Admin Profile', icon: FaUser },
        { to: '/admin/users', label: 'Manage Users', icon: FaUsers },
        { to: '/admin/recipes', label: 'Recipes', icon: FaBook },
        { to: '/admin/articles', label: 'Articles', icon: FaBook },
        { to: '/admin/videos', label: 'Videos', icon: FaVideo },
        { to: '/admin/quizzes', label: 'Quizzes', icon: FaQuestionCircle },
      ]
    : [
        { to: '/profile', label: 'My Profile', icon: FaUser },
        { to: '/signin', label: 'Recipes', icon: FaBook },
        { to: '/articles', label: 'Articles', icon: FaBook },
        { to: '/videos', label: 'Videos', icon: FaVideo },
        { to: '/quizzes', label: 'Quizzes', icon: FaQuestionCircle },
      ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/signin');
  };

  return (
    <aside className="w-64 bg-white border-r shadow-sm hidden md:flex flex-col">
      <div className="p-6 text-2xl font-bold text-blue-600">CookingApp</div>
      <nav className="flex-1 px-4">
        {menu.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center p-3 my-1 rounded ${
                isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
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
  );
}
