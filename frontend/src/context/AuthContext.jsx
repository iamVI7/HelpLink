import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ✅ FIX: Set the Authorization header SYNCHRONOUSLY at module load time.
// This runs once when the JS module is first imported — before any component
// mounts, before any useEffect fires, before any API call is made.
const storedToken = localStorage.getItem('token');
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const isFetchingRef  = useRef(false);
  const loadedTokenRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  // ✅ Keep axios default header in sync whenever token state changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // ✅ Load user profile once per unique token
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }

    if (loadedTokenRef.current === token) {
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;

    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadUser = async () => {
    if (!token || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
      loadedTokenRef.current = token;
    } catch (error) {
      console.error('Error loading user:', error);
      if (error.response?.status === 401) {
        logoutSilent();
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  // Internal silent logout — no toast, resets all refs
  const logoutSilent = () => {
    localStorage.removeItem('token');
    loadedTokenRef.current = null;
    isFetchingRef.current  = false;
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token: newToken, ...userInfo } = response.data;

      localStorage.setItem('token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      loadedTokenRef.current = newToken;
      setToken(newToken);
      setUser(userInfo);

      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return { success: false };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, ...userInfo } = response.data;

      localStorage.setItem('token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      loadedTokenRef.current = newToken;
      setToken(newToken);
      setUser(userInfo);

      toast.success(`Welcome back, ${userInfo.name}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    loadedTokenRef.current = null;
    isFetchingRef.current  = false;
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const updateAvailability = async (isAvailable) => {
    try {
      const response = await api.patch('/auth/availability', { isAvailable });
      setUser(prev => ({ ...prev, ...response.data }));
      toast.success(`You are now ${isAvailable ? 'available' : 'unavailable'}`);
      return { success: true };
    } catch {
      toast.error('Failed to update availability');
      return { success: false };
    }
  };

  /**
   * ✅ NEW: refreshUser — called after OTP verification to sync isVerified
   * into the global user state without forcing a full re-login.
   * Isolated: only updates user state, touches nothing else.
   */
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
    } catch (error) {
      console.error('refreshUser error:', error);
    }
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    updateAvailability,
    refreshUser,           // ✅ NEW — exposed for OTP modal to call after verify
    isAuthenticated: !!user,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};