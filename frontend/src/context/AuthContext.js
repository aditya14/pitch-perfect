import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';
import LoadingScreen from '../components/elements/LoadingScreen';
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Apply system theme preference or stored theme on initial load
  useEffect(() => {
    // Check if we're on an auth page (login/register)
    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
    
    if (isAuthPage) {
      // Always force dark mode for auth pages
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0a0a0a';
      document.documentElement.dataset.theme = 'dark';
    } else {
      // For non-auth pages, apply normal theme logic
      const storedTheme = localStorage.getItem('theme');
      
      // Apply theme from localStorage or system preference
      if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.backgroundColor = '#0a0a0a';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.backgroundColor = '#ffffff';
      }
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await api.get('/user/');
          console.log('User data:', response.data);
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth error:', error);
          clearAccessToken();
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/token/', {
        username,
        password
      });
      
      const accessToken = response.data.access;
      setAccessToken(accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      const userResponse = await api.get('/user/');
      setUser(userResponse.data);
      setIsAuthenticated(true);
      
      return userResponse.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      // Create the user account
      const response = await api.post('/register/', userData);
      
      // Login after successful registration
      await login(userData.username || userData.email, userData.password);
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    clearAccessToken();
    // Clear theme preferences on logout so next login uses default dark mode
    localStorage.removeItem('theme');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    
    // Force dark mode for login screen
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#0a0a0a';
    document.documentElement.dataset.theme = 'dark';
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    login,
    register,
    logout
  };

  // Force dark mode to be properly applied to LoadingScreen
  if (loading) {
    return <LoadingScreen message="Connecting..." />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
