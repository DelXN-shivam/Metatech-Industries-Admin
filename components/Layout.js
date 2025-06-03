import React from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from './ThemeContext';

// Dynamically import components to avoid SSR issues
const Navbar = dynamic(() => import('./Navbar'), { ssr: false });
const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });

const Layout = ({ children }) => {
  const { darkMode } = useTheme();

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 