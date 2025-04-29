// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import PrivateRoute from './components/PrivateRoute';

// Public pages
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Home from './pages/Home';

// Customer
import CustomerRestaurants from './pages/restaurant/CustomerRestaurants';
import RestaurantMenu      from './pages/menu/RestaurantMenu';
import Cart                from './pages/menu/Cart';
import Checkout            from './pages/order/Checkout';
import PaymentPage         from './pages/payment/Payment';
import MyOrders            from './pages/order/MyOrders';
import OrderDetails        from './pages/order/OrderDetails';
import Profile             from './pages/Profile';

// Owner
import AddRestaurant     from './pages/restaurant/AddRestaurant';
import MyRestaurants     from './pages/restaurant/MyRestaurants';
import RestaurantDetails from './pages/restaurant/RestaurantDetails';
import EditRestaurant    from './pages/restaurant/EditRestaurant';
import AddMenuItem       from './pages/menu/AddMenuItem';
import EditMenuItem      from './pages/menu/EditMenuItem';
import OwnerOrders       from './pages/order/OwnerOrders';
import OwnerOrderDetails from './pages/order/OwnerOrderDetails';
import OwnerProfile      from './pages/OwnerProfile';

// Driver
import DriverProfile      from './pages/DriverProfile';
import DriverOrders       from './pages/driver/DriverOrders';
import DriverOrderDetails from './pages/driver/DriverOrderDetails';

// Admin
import AdminProfile from './pages/AdminProfile';
import AdminAddUser from './pages/AdminAddUser';
import AdminUsers   from './pages/AdminUsers';

export default function App() {
  return (

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 overflow-auto">
          <Routes>
            {/* Public */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/" element={<Home />} />

            {/* Customer */}
            <Route element={<PrivateRoute allowedRoles={['user']} />}>
              <Route path="/restaurants/customer" element={<CustomerRestaurants />} />
              <Route path="/restaurants/:id/menu" element={<RestaurantMenu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/orders/my" element={<MyOrders />} />
              <Route path="/orders/:orderId" element={<OrderDetails />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Owner */}
            <Route element={<PrivateRoute allowedRoles={['owner']} />}>
              <Route path="/restaurants/add" element={<AddRestaurant />} />
              <Route path="/restaurants/my" element={<MyRestaurants />} />
              <Route path="/restaurants/:id" element={<RestaurantDetails />} />
              <Route path="/restaurants/edit/:id" element={<EditRestaurant />} />
              <Route path="/restaurants/:restaurantId/menu/add" element={<AddMenuItem />} />
              <Route path="/restaurants/:restaurantId/menu/edit/:menuItemId" element={<EditMenuItem />} />
              <Route path="/orders/owner" element={<OwnerOrders />} />
              <Route path="/owner/orders/:orderId" element={<OwnerOrderDetails />} />
              <Route path="/owner/profile" element={<OwnerProfile />} />
            </Route>

            {/* Driver */}
            <Route element={<PrivateRoute allowedRoles={['driver']} />}>
              <Route path="/driver/profile" element={<DriverProfile />} />
              <Route path="/driver/orders" element={<DriverOrders />} />
              <Route path="/driver/orders/:orderId" element={<DriverOrderDetails />} />
            </Route>

            {/* Admin */}
            <Route element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/adduser" element={<AdminAddUser />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </main>
      </div>
  );
}
