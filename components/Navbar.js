import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const router = useRouter();
  const profileRef = useRef(null);

  useEffect(() => {
    // Get user details from localStorage when component mounts
    const storedUserDetails = localStorage.getItem('userDetails');
    if (storedUserDetails) {
      setUserDetails(JSON.parse(storedUserDetails));
    }

    // Add click outside listener
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    // Clear all authentication tokens and user details
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('code');
    localStorage.removeItem('userDetails');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isVerified');
    localStorage.removeItem('sessionExpiry');
    

    // Close the profile dropdown
    setIsProfileOpen(false);

    // Give the browser a short moment to complete the localStorage updates
    setTimeout(() => {
      // Redirect to root path where SimpleSignOn is rendered
      window.location.href = '/verify';
    }, 1000); // Delay of 100ms
  };


  return (
    <nav className="bg-[#0057B8]">
      <div className="max-w-7xl mx-auto px-4 py-1 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-white">Report Generation Dashboard</span>
          </div>

          <div className="flex items-center">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <div className="relative">
                  <img
                    className="h-10 w-10 rounded-full ring-2 ring-white/50"
                    src={userDetails?.picture || "/user_icon.jpg"}
                    alt="User profile"
                  />
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-blue-600"></span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white">{userDetails?.name || 'Admin Name'}</p>
                  <p className="text-xs text-white/70">{userDetails?.email || 'Administrator'}</p>
                </div>
                <svg
                  className={`h-5 w-5 text-white/70 transition-transform duration-200 ${isProfileOpen ? 'transform rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className={`absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl py-2 z-10`}>
                  <div className={`px-4 py-3 border-b border-gray-100`}>
                    <p className={`text-sm font-medium text-gray-800`}>{userDetails?.name || 'Admin Name'}</p>
                    <p className={`text-xs text-gray-500`}>{userDetails?.email || 'admin@metatech.com'}</p>
                  </div>

                  <div className={`border-t border-gray-100`}></div>

                  {/* <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Profile
                  </Link> */}

                  {/* <Link href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link> */}

                  <div className={`border-t border-gray-100`}></div>

                  <button
                    onClick={handleSignOut}
                    className={`flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100`}
                  >
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 