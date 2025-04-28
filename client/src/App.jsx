import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import AdminProfile from './pages/AdminProfile';
import Header from './components/Header';
import DriverProfile from './pages/DriverProfile';
import OwnerProfile from './pages/OwnerProfile';
import AddRestaurant from './pages/restaurant/AddRestaurant';
import MyRestaurants from './pages/restaurant/MyRestaurants';
import RestaurantDetails from './pages/restaurant/RestaurantDetails';
import EditRestaurant from './pages/restaurant/EditRestaurant';
import AddMenuItem from './pages/menu/AddMenuItem';
import EditMenuItem from './pages/menu/EditMenuItem';
import CustomerRestaurants from './pages/restaurant/CustomerRestaurants';
import RestaurantMenu from './pages/menu/RestaurantMenu';
import Cart from './pages/menu/Cart';
import Checkout from './pages/order/Checkout';
import PaymentPage from './pages/payment/Payment';
import OrderDetails from './pages/order/OrderDetails';
function App() {

  return( <>
  <Header />
    <Routes>
      
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/profile" element={<Profile />}/>
      <Route path="/admin/profile" element={ <AdminProfile />} />
      <Route path="/driver/profile" element={<DriverProfile />} />
      <Route path="/owner/profile" element={<OwnerProfile />} />

      <Route path="/restaurants/add" element={<AddRestaurant />} />
      <Route path="/restaurants/my" element={<MyRestaurants />} />
      <Route path="/restaurants/:id" element={<RestaurantDetails />} />
      <Route path="/restaurants/edit/:id" element={<EditRestaurant />} />

      <Route path="/restaurants/:restaurantId/menu/add" element={<AddMenuItem />}/>
      <Route path="/restaurants/:restaurantId/menu/edit/:menuItemId" element={<EditMenuItem />}/>
      <Route path="/restaurants/customer" element={<CustomerRestaurants />} />
      <Route path="/restaurants/:id/menu" element={<RestaurantMenu />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/orders/:orderId" element={<OrderDetails />} />

    </Routes>
    </>
  );
}


export default App
