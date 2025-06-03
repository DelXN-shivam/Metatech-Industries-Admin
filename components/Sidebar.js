import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from './ThemeContext';

const Sidebar = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const { darkMode, toggleTheme } = useTheme();

  // Check if current route is under /list/ (for nested folders)
  const isGoogleDriveActive = router.pathname.startsWith('/list/');
  // Check if current route is exactly root
  const isDashboardActive = router.pathname === '/';

  const menuItems = [
    {
      title: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      path: '/',
      isActive: isDashboardActive
    },
    {
      title: 'Google Drive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      path: '/list/root',
      isActive: isGoogleDriveActive
    },
    // {
    //   title: darkMode ? 'Light Mode' : 'Dark Mode',
    //   icon: (
    //     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path
    //         strokeLinecap="round"
    //         strokeLinejoin="round"
    //         strokeWidth="2"
    //         d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    //       />
    //     </svg>
    //   ),
    //   path: '',
    //   isActive: false,
    //   onClick: toggleTheme
    // }
  ];

  const handleNavigation = (item) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      router.push(item.path);
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-[#0057B8] to-[#0057B8]'} ${isOpen ? 'w-64' : 'w-20'} min-h-screen transition-all duration-300 ease-in-out`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h1 className={`text-xl font-bold text-white`}>
          {isOpen ? 'Metatech' : ''}
        </h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-100' : 'hover:bg-gray-100 hover:text-blue-700'}`}
        >
          <svg className={`w-6 h-6 ${darkMode ? 'text-white hover:text-black' : 'text-gray-100 hover:text-blue-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => (
          <div
            key={item.title}
            onClick={() => handleNavigation(item)}
            className={`flex items-center px-4 py-3 cursor-pointer transition-colors duration-200 ${item.isActive
                ? darkMode
                  ? 'bg-blue-900 text-white'
                  : 'bg-blue-100 text-blue-700'
                : darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-100 hover:bg-gray-100 hover:text-blue-700'
              }`}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            {isOpen && <span className="ml-3">{item.title}</span>}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 