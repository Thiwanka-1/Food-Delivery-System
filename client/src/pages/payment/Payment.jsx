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
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';

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

  // 2) Create PaymentIntent & confirm payment
  const handlePay = async e => {
    e.preventDefault();
    if (!stripe || !elements || !order) return;
    setError('');
    setCreating(true);

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId,
          amount: order.totalPrice,
        }),
      });
      const { clientSecret, message } = await res.json();
      if (!res.ok) throw new Error(message || 'Payment initialization failed');

      setCreating(false);
      setProcessing(true);

      const card = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (result.error) throw result.error;

      // on success, remove from cart
      const raw = localStorage.getItem('cart');
      const current = JSON.parse(localStorage.getItem('currentOrder') || 'null');
      if (raw && current) {
        const cart = JSON.parse(raw).filter(
          o => o.restaurantId !== current.restaurantId
        );
        if (cart.length) localStorage.setItem('cart', JSON.stringify(cart));
        else localStorage.removeItem('cart');
      }
      localStorage.removeItem('currentOrder');

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

  if (error && !order) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <p className="text-red-600">Error: {error}</p>
        </main>
      </div>
    );
  }

  const subtotal = order.orderItems.reduce(
    (sum, it) => sum + it.quantity * it.price,
    0
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 flex items-start justify-center">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ─── ORDER SUMMARY PANEL ─── */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-6">Order Summary</h2>
            <div className="space-y-4">
              {order.orderItems.map(item => (
                <div
                  key={item.menuItemId}
                  className="flex items-center space-x-4"
                >
                  <img
                    src={item.menuItemDetails.imageUrl}
                    alt={item.menuItemDetails.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.menuItemDetails.name}
                    </p>
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
            <div className="mt-8 border-t pt-4 space-y-2 text-right">
              <div className="text-lg">
                <span className="font-medium">Subtotal:</span>{' '}
                ₨ {subtotal.toFixed(2)}
              </div>
              <div className="text-2xl font-bold">Total Due: ₨ {order.totalPrice.toFixed(2)}</div>
            </div>
          </div>

          {/* ─── PAYMENT FORM PANEL ─── */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-6">Payment Details</h2>
            <form onSubmit={handlePay} className="space-y-6">
              <div>
                <label className="block text-gray-700 mb-2">
                  Card Information
                </label>
                <div className="p-4 border border-gray-300 rounded-lg">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#333',
                        },
                        invalid: {
                          color: '#e53e3e',
                        },
                      },
                    }}
                  />
                </div>
              </div>
              {error && <p className="text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={!stripe || creating || processing}
                className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg text-white font-semibold transition ${
                  creating || processing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {creating || processing ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaCheckCircle />
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
        </div>
      </main>
    </div>
  );
}
