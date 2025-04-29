// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaBolt,
  FaUtensils,
  FaMapMarkedAlt,
  FaClock,
  FaMobileAlt,
  FaEnvelope,
} from 'react-icons/fa';

export default function Home() {
  return (
    <div className="flex flex-col">

      {/* Hero (UNCHANGED) */}
      <section className="relative flex flex-col-reverse lg:flex-row items-center bg-gray-100">
        <div className="w-full lg:w-1/2 p-8 lg:p-16 space-y-6">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900">
            Food at Your Doorstep,
            <br />
            Faster Than Ever
          </h1>
          <p className="text-lg text-gray-700">
            Quick Eats brings your favorite local restaurants straight to you
            in record time. Browse menus, track delivery in real time, and
            enjoy unbeatable convenience.
          </p>
          <div className="flex space-x-4">
            <Link
              to="/restaurants/customer"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow transition"
            >
              Order Now
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center border-2 border-blue-600 hover:bg-blue-600 hover:text-white text-blue-600 px-6 py-3 rounded-full font-semibold transition"
            >
              Create Account
            </Link>
          </div>
        </div>
        <div className="w-full lg:w-1/2 h-64 lg:h-auto">
          <img
            src="https://img.freepik.com/free-photo/chicken-skewers-with-onions-top-salad_1220-567.jpg"
            alt="Delicious meal"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Rich Features with Icon Circles & Gradient */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-white">
        <div className="container mx-auto px-6 lg:px-20 text-center space-y-8">
          <h2 className="text-3xl font-bold text-gray-900">Why Quick Eats?</h2>
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: FaBolt,
                title: 'Lightning Fast',
                desc: 'Delivered in under 30 minutes, guaranteed.'
              },
              {
                Icon: FaUtensils,
                title: 'Wide Selection',
                desc: 'Hundreds of restaurants & thousands of dishes.'
              },
              {
                Icon: FaMapMarkedAlt,
                title: 'Local Favorites',
                desc: 'Discover hidden gems in your neighborhood.'
              },
              {
                Icon: FaClock,
                title: 'Real-Time Tracking',
                desc: 'Follow your order every step of the way.'
              }
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col items-center space-y-4 p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition"
              >
                <div className="p-4 bg-blue-100 rounded-full">
                  <Icon className="text-3xl text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works with Overlapping Cards */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 lg:px-20 text-center space-y-8">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <div className="relative">
            {/* Decorative background image */}
            
            <div className="relative grid gap-12 sm:grid-cols-3">
              {[
                {
                  Icon: FaMobileAlt,
                  step: '1. Browse & Order',
                  desc: 'Explore restaurants, read reviews & add to cart.'
                },
                {
                  Icon: FaClock,
                  step: '2. Swift Delivery',
                  desc: 'Drivers pick up & deliver in record time.'
                },
                {
                  Icon: FaMapMarkedAlt,
                  step: '3. Enjoy!',
                  desc: 'Fresh, hot meals delivered right to your door.'
                }
              ].map(({ Icon, step, desc }) => (
                <div
                  key={step}
                  className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition relative z-10"
                >
                  <Icon className="mx-auto text-4xl text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{step}</h3>
                  <p className="text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial with Diagonal Accent */}
      <section className="py-20 bg-blue-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 transform -skew-y-3 bg-white opacity-10"></div>
        <div className="container mx-auto px-6 lg:px-20 relative space-y-8">
          <h2 className="text-3xl font-bold">What Our Customers Say</h2>
          <blockquote className="text-xl italic max-w-2xl mx-auto">
            “Quick Eats has completely transformed my evenings—no more waiting,
            just great food fast! The live tracking is so reassuring.”
          </blockquote>
          <p className="font-semibold text-blue-300">— Alex P.</p>
        </div>
      </section>

      {/* New Get in Touch Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 lg:px-20 flex flex-col lg:flex-row items-center gap-8">
          <div className="lg:w-1/2">
            <img
              src="https://img.freepik.com/free-photo/chicken-skewers-with-slices-sweet-peppers-dill_2829-18813.jpg?ga=GA1.1.1617633811.1740464666&semt=ais_hybrid&w=740"
              alt="Get in touch"
              className="w-full lg:h-full h-80 object-cover rounded-lg shadow-lg"
            />
          </div>
          <div className="lg:w-1/2 space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">
              Have Questions? Get in Touch!
            </h2>
            <p className="text-gray-700">
              Whether you’re curious about becoming a driver, partnering with
              us, or need help with an order, our support team is here for you.
              Click below to reach our Contact page and we’ll respond promptly!
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow transition"
            >
              <FaEnvelope className="mr-2" /> Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-6 lg:px-20 text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to Eat Fast?</h2>
          <p className="text-lg opacity-90">
            Sign up and get your first delivery in under 30 minutes!
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-full font-semibold shadow transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8">
        <div className="container mx-auto px-6 lg:px-20 text-center space-y-2">
          <p>&copy; {new Date().getFullYear()} Quick Eats. All rights reserved.</p>
          <p>
            <a href="/terms" className="underline hover:text-white">Terms of Service</a>
            &nbsp;|&nbsp;
            <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
