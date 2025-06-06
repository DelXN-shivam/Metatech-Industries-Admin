"use client";
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { AtSign } from 'lucide-react';
import { useRouter } from 'next/router';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // List of allowed emails
  const allowedEmails = [
    'mktg@metatechind.com',
    'testoktest1@gmail.com'
  ];

  useEffect(() => {
    document.title = "Login | Metatech Industries";
    
    // Check if already verified
    const isVerified = localStorage.getItem('isVerified');
    if (isVerified === 'true') {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate email against allowed list
    if (!allowedEmails.includes(email)) {
      setError('Invalid email address. Please use an authorized email.');
      return;
    }

    // Store verification status and email
    localStorage.setItem('isVerified', 'true');
    localStorage.setItem('userEmail', email);

    // Redirect to home page
    router.push('/');
  };

  return (
    <>
      <div className="min-h-screen flex items-stretch bg-gradient-to-br from-blue-400 to-purple-200">
        {/* Left Side - Decorative Image Section */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/images/login_image.jpg')" }}></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white/80 backdrop-blur-sm">
          <div className="w-full max-w-md">
            {/* Company Logo */}
            <div className="mb-8 text-center">
              <div className="inline-block pb-4">
                <div className="bg-white p-4 rounded-lg">
                  <Image
                    src="/metatech_logo.png"
                    width={230}
                    height={80}
                    alt="Metatech Logo" />
                </div>
              </div>
              <p className="text-gray-600 mt-2">Sign in to continue</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="pl-10 block w-full px-3 py-3 border text-gray-600 border-gray-300 rounded-lg shadow-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 
                             transition duration-300 ease-in-out hover:border-blue-400"/>
              </div>

              {error && (
                <div className="text-red-500 text-sm mt-2">
                  {error}
                </div>
              )}

              {/* Sign In Button */}
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent 
                             rounded-lg shadow-md text-sm font-semibold text-white 
                             bg-gradient-to-r from-blue-400 to-blue-600 
                             hover:from-blue-400 hover:to-purple-700 
                             focus:outline-none focus:ring-2 focus:ring-offset-2 
                             focus:ring-blue-400 transition duration-300 ease-in-out transform 
                             hover:scale-[1.02] active:scale-[0.98]">
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
