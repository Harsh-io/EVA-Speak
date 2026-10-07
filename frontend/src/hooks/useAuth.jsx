// Auth context + Google OAuth hook for EVA Speak
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthUser, logoutUser, registerUser as apiRegister, loginWithEmail as apiLoginWithEmail } from '../utils/api.jsx';
import { cacheClear } from '../utils/cache.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAuthUser();
      setUser(data.user || null);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err.status !== 401) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    window.location.href = `${apiBase}/api/auth/google`;
  }, []);

  const loginWithEmail = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiLoginWithEmail(email, password);
      setUser(data.user || null);
      return data;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRegister(name, email, password);
      setUser(data.user || null);
      return data;
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Proceed with local logout even if API call fails
    }
    setUser(null);
    await cacheClear();
  }, []);

  const value = { user, loading, error, login, loginWithEmail, register, logout, refreshAuth: checkAuth };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
