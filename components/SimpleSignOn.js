import React, { useState, useEffect } from 'react';
import axios from 'axios';
var config = require('../config.json');

const SimpleSignOn = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [currentURL, setCurrentURL] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentURL) {
      setCurrentURL(window.location.href);
    }
  }, [currentURL]);
 
  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: config.api.client_id,
        client_secret: config.api.client_secret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        return response.data.access_token;
      }
      return null;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return null;
    }
  };

  const fetchUserProfile = async (accessToken) => {
    try {
      // First validate the token
      const tokenInfo = await axios.get('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        params: { access_token: accessToken }
      });

      if (tokenInfo.data && tokenInfo.data.expires_in > 0) {
        // Token is valid, now fetch user info
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
      } else {
        // Token is invalid or expired
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const newAccessToken = await refreshAccessToken(refreshToken);
          if (newAccessToken) {
            return await fetchUserProfile(newAccessToken);
          }
        }
      }
      return false;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      if (err.response && err.response.status === 401) {
        // Token is invalid, try to refresh
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const newAccessToken = await refreshAccessToken(refreshToken);
          if (newAccessToken) {
            return await fetchUserProfile(newAccessToken);
          }
        }
      }
      return false;
    }
  };

  const validateToken = async () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      // First try with current access token
      const response = await axios.get('https://www.googleapis.com/drive/v2/about', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.data) {
        // Fetch and store user profile information
        const profileSuccess = await fetchUserProfile(accessToken);
        if (profileSuccess) {
          setIsAuthenticated(true);
          window.dispatchEvent(new CustomEvent('tokenValidated'));
          // If we're on the login page, redirect to dashboard
          if (window.location.pathname === '/login') {
            window.location.href = '/';
          }
        } else {
          throw new Error('Failed to fetch user profile');
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Token expired, try to refresh
        const newAccessToken = await refreshAccessToken(refreshToken);
        
        if (newAccessToken) {
          try {
            // Validate the new token
            const response = await axios.get('https://www.googleapis.com/drive/v2/about', {
              headers: { Authorization: `Bearer ${newAccessToken}` }
            });

            if (response.data) {
              // Fetch and store user profile information with new token
              const profileSuccess = await fetchUserProfile(newAccessToken);
              if (profileSuccess) {
                setIsAuthenticated(true);
                window.dispatchEvent(new CustomEvent('tokenValidated'));
                // If we're on the login page, redirect to dashboard
                if (window.location.pathname === '/login') {
                  window.location.href = '/';
                }
              } else {
                throw new Error('Failed to fetch user profile after token refresh');
              }
            }
          } catch (refreshErr) {
            console.error('Error validating refreshed token:', refreshErr);
            // Clear tokens and user details if refresh validation fails
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userDetails');
          }
        } else {
          // Clear tokens and user details if refresh fails
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('userDetails');
        }
      } else {
        console.error('Token validation error:', err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userDetails');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    validateToken();
  }, []);

  const handleSignOn = async () => {
    try {
      // Add userinfo scopes to the existing scopes
      const userInfoScopes = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      const allScopes = `${config.api.scopes} ${userInfoScopes}`;
      
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent&response_type=code&client_id=${config.api.client_id}&redirect_uri=${currentURL}login&scope=${encodeURIComponent(allScopes)}`;
    } catch (err) {
      setError(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Metatech Report Generation Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please sign in with your Google account to continue
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  An error occurred: {error.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            onClick={handleSignOn}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
            </span>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleSignOn;
