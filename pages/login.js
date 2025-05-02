import React, { useState, useEffect } from 'react';
import Router from 'next/router'
import axios from 'axios';

var config = require('../config.json');

const fetchUserProfile = async (accessToken) => {
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data) {
      const userDetails = {
        name: response.data.name,
        email: response.data.email,
        picture: response.data.picture
      };
      localStorage.setItem('userDetails', JSON.stringify(userDetails));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return false;
  }
};

const handleRedirect = async (code, currentURL = "") => {
  const redirectUri = currentURL.replace(/\/login.*/, "/login");

  try {
    console.log(currentURL)
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code: code,
      client_id: config.api.client_id,
      client_secret: config.api.client_secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    localStorage.setItem('code', code);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Fetch and store user profile information
    const profileSuccess = await fetchUserProfile(accessToken);
    if (!profileSuccess) {
      console.error('Failed to fetch user profile');
    }

    Router.push('/')
  } catch (err) {
    console.error('Error during authentication:', err);
    alert('Authentication failed. Please try again.');
  }
};

const Page = ({ code }) => {
  const [currentURL, setCurrentURL] = useState(null);

  useEffect(() => {
    setCurrentURL(window.location.href);
  }, [])

  useEffect(() => {
    if (currentURL) {
      handleRedirect(code, currentURL)
    }
  }, [currentURL])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}

Page.getInitialProps = async ({ query }) => {
  return { code: query.code }
}

export default Page
