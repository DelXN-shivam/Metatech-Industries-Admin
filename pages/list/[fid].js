import Head from 'next/head'
import React, { useState } from 'react';
import HeaderImage from '../../components/HeaderImage';
import GoogleDriveSearch from '../../components/GoogleDriveSearch'
import SimpleSignOn from '../../components/SimpleSignOn'
import PlayBookFolders from '../../components/PlayBookFolders';
import PlayBookFiles from '../../components/PlayBookFiles';
import FolderName from '../../components/FolderName';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import StatsCards from '../../components/StatsCards';
import { useTheme } from '../../components/ThemeContext';

export default function Drilldown() {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Head>
        <title>Google Drive Explorer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        <SimpleSignOn>
          <main className="container mx-auto px-4 py-8">
            <div className="space-y-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4`}>
                <FolderName />
              </div>

              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4`}>
                <GoogleDriveSearch />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Folders</h2>
                  <PlayBookFolders />
                </div>

                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Files</h2>
                  <PlayBookFiles />
                </div>
              </div>
            </div>
          </main>

          <footer className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t mt-8`}>
            <div className="container mx-auto px-4 py-6">
              <div className="flex justify-between items-center">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  © {new Date().getFullYear()} Google Drive Explorer for Metatech Industries
                </p>
                <div className="flex space-x-4">
                  <a href="#" className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>Privacy Policy</a>
                  <a href="#" className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>Terms of Service</a>
                </div>
              </div>
            </div>
          </footer>
        </SimpleSignOn>
      </Layout>
    </div>
  )
}
