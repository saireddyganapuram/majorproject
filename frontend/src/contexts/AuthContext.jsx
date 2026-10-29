import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the application and provides authentication state
 * and actions (login, register, logout, fetchUser) to all child components.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current user on mount
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/v1/auth/me');
      setUser(response.data);
      setError(null);
    } catch (err) {
      setUser(null);
      // Don't set error for 401 — user is simply not logged in
      if (err.status !== 401) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await api.post('/v1/auth/login', { email, password });
    setUser(response.data);
    setError(null);
    return response;
  };

  const register = async (userData) => {
    const response = await api.post('/v1/auth/register', userData);
    setUser(response.data);
    setError(null);
    return response;
  };

  const logout = async () => {
    try {
      await api.post('/v1/auth/logout');
    } catch {
      // Logout should always clear local state even if the API call fails
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication state and actions.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
