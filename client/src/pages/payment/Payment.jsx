// src/pages/Payment.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { FaSpinner } from 'react-icons/fa';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function PaymentPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
}

function PaymentForm() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const orderId = new URLSearchParams(search).get('orderId');

  const stripe = useStripe();
  const elements = useElements();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // 1) Load order details
  useEffect(() => {
    if (!orderId) {
      navigate('/cart');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/orders/get/${orderId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load order');
        setOrder(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingOrder(false);
      }
    })();
  }, [orderId]);

  // 2) Create Stripe PaymentIntent when user submits
  const handlePay = async e => {
    e.preventDefault();
    if (!stripe || !elements || !order) return;
    setError('');
    setCreating(true);

    try {
      const userId = localStorage.getItem('userId');
      const amount = order.totalPrice; // as recorded in the order
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, userId, amount }),
      });
      const { clientSecret, paymentId, message } = await res.json();
      if (!res.ok) throw new Error(message || 'Payment initialization failed');

      setCreating(false);
      setProcessing(true);

      // 3) Confirm card payment
      const card = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (result.error) throw result.error;
      // 4) Success: navigate to order tracking page
      navigate(`/orders/${orderId}`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
      setProcessing(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-gray-500" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <p className="text-red-600">Error: {error}</p>
        </main>
      </div>
    );
  }

  // Order summary
  const subtotal = order.orderItems.reduce(
    (sum, it) => sum + it.quantity * it.price,
    0
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 flex justify-center">
        <div className="w-full max-w-lg space-y-8">
          <h1 className="text-3xl font-bold text-center mb-4">
            Payment for Order #{order._id}
          </h1>

          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Order Summary</h2>
            <div className="divide-y">
              {order.orderItems.map(item => (
                <div
                  key={item.menuItemId}
                  className="flex items-center py-3 space-x-4"
                >
                  <img
                    src={item.menuItemDetails.imageUrl}
                    alt={item.menuItemDetails.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.menuItemDetails.name}</p>
                    <p className="text-gray-600">
                      {item.quantity} × ₨ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    ₨ {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-right space-y-1">
              <div>
                <span className="font-medium">Subtotal:</span> ₨{' '}
                {subtotal.toFixed(2)}
              </div>
              <div className="text-xl font-bold">
                Total Due: ₨ {order.totalPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form
            onSubmit={handlePay}
            className="bg-white p-6 rounded-lg shadow-md space-y-4"
          >
            <h2 className="text-2xl font-semibold">Enter Payment Details</h2>
            <div className="p-4 border rounded">
              <CardElement
                options={{
                  style: {
                    base: { fontSize: '16px', color: '#333' },
                    invalid: { color: '#e53e3e' },
                  },
                }}
              />
            </div>
            {error && <p className="text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!stripe || creating || processing}
              className={`w-full py-3 rounded-lg font-semibold text-white flex justify-center items-center space-x-2 ${
                creating || processing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {(creating || processing) && (
                <FaSpinner className="animate-spin" />
              )}
              <span>
                {creating
                  ? 'Initializing…'
                  : processing
                  ? 'Processing…'
                  : `Pay ₨ ${order.totalPrice.toFixed(2)}`}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
