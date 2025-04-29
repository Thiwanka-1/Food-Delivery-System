// src/pages/ContactUs.jsx
import React from 'react';
import Sidebar from '../components/Sidebar';
import {
  FaEnvelope,
  FaPhoneAlt,
  FaCar,
  FaStore,
  FaLifeRing,
} from 'react-icons/fa';

export default function ContactUs() {
  return (
    <div className="flex min-h-screen bg-gray-50">

      <main className="flex-1 p-8 space-y-16">
        {/* Hero */}
        <section className="relative flex flex-col lg:flex-row items-center bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="lg:w-1/2 h-64 lg:h-auto">
            <img
              src="https://img.freepik.com/free-photo/businesswoman-call-center-office_1098-984.jpg?t=st=1745935557~exp=1745939157~hmac=d3431f9991d43a8aeac23ef8e109b9bfdfb7c7e62d5af424f3f775ccf9eb36f6&w=996"
              alt="Customer Support"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:w-1/2 p-8 space-y-4">
            <h1 className="text-4xl font-extrabold text-gray-900">
              We’re Here to Help
            </h1>
            <p className="text-gray-700">
              Whether you’re a hungry customer, an aspiring driver, or a restaurant looking to partner with us, our team is standing by to answer your questions. Reach out any time—your satisfaction is our top priority.
            </p>
          </div>
        </section>

        {/* Contact Cards */}
        <section className="grid gap-8 sm:grid-cols-3">
          {/* General Support */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center space-y-4">
            <FaLifeRing className="text-4xl text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">General Support</h2>
            <p className="text-gray-600">
              Questions about orders, the app, or feedback?
            </p>
            <a href="mailto:support@quickeats.com" className="inline-flex items-center text-blue-600 hover:underline">
              <FaEnvelope className="mr-2" /> support@quickeats.com
            </a>
            <a href="tel:+15551234567" className="inline-flex items-center text-blue-600 hover:underline">
              <FaPhoneAlt className="mr-2" /> +1&nbsp;(555)&nbsp;123-4567
            </a>
          </div>

          {/* Driver Registration */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center space-y-4">
            <FaCar className="text-4xl text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Driver Inquiries</h2>
            <p className="text-gray-600">
              Ready to join the Quick Eats driver team?
            </p>
            <a href="mailto:drivers@quickeats.com" className="inline-flex items-center text-blue-600 hover:underline">
              <FaEnvelope className="mr-2" /> drivers@quickeats.com
            </a>
            <a href="tel:+15552345678" className="inline-flex items-center text-blue-600 hover:underline">
              <FaPhoneAlt className="mr-2" /> +1&nbsp;(555)&nbsp;234-5678
            </a>
          </div>

          {/* Restaurant Partnerships */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center space-y-4">
            <FaStore className="text-4xl text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Partner With Us</h2>
            <p className="text-gray-600">
              Interested in listing your restaurant on Quick Eats?
            </p>
            <a href="mailto:partners@quickeats.com" className="inline-flex items-center text-blue-600 hover:underline">
              <FaEnvelope className="mr-2" /> partners@quickeats.com
            </a>
            <a href="tel:+15553456789" className="inline-flex items-center text-blue-600 hover:underline">
              <FaPhoneAlt className="mr-2" /> +1&nbsp;(555)&nbsp;345-6789
            </a>
          </div>
        </section>

        {/* Office Info */}
        <section className="bg-white rounded-lg shadow-md p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Our Headquarters</h2>
          <p className="text-gray-700">
            Quick Eats, Inc.<br />
            123 Quick St.<br />
            Foodville, FV 12345
          </p>
          <div className="h-48 w-full overflow-hidden rounded-lg">
            <iframe
              title="Quick Eats Office Location"
              className="w-full h-full"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.086096045257!2d-122.4194151846813!3d37.774929279759794!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085818c5f832c01%3A0x4bcd7bd1e2bce9c0!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2sus!4v1616626750405!5m2!1sen!2sus"
              frameBorder="0"
              allowFullScreen=""
              aria-hidden="false"
              tabIndex="0"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
