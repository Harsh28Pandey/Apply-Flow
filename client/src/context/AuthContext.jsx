import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api, { setAccessToken } from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext();

let inFlightAuthPromise = null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('applyflow_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !localStorage.getItem('applyflow_user');
    } catch {
      return true;
    }
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function initAuth() {
      if (inFlightAuthPromise) {
        return inFlightAuthPromise;
      }

      inFlightAuthPromise = (async () => {
        try {
          const storedRefresh = localStorage.getItem('applyflow_refresh') || undefined;
          const { data } = await api.post('/auth/refresh', { refreshToken: storedRefresh });

          if (data?.accessToken) {
            setAccessToken(data.accessToken);
          }
          if (data?.refreshToken) {
            localStorage.setItem('applyflow_refresh', data.refreshToken);
          }
          if (data?.user) {
            localStorage.setItem('applyflow_user', JSON.stringify(data.user));
            if (isMountedRef.current) setUser(data.user);
          }
        } catch {
          if (!localStorage.getItem('applyflow_token')) {
            try {
              localStorage.removeItem('applyflow_user');
              localStorage.removeItem('applyflow_token');
              localStorage.removeItem('applyflow_refresh');
            } catch {}
            if (isMountedRef.current) setUser(null);
          }
        } finally {
          inFlightAuthPromise = null;
          if (isMountedRef.current) setIsLoading(false);
        }
      })();

      return inFlightAuthPromise;
    }

    initAuth();

    const handleAuthExpired = () => {
      try {
        localStorage.removeItem('applyflow_user');
        localStorage.removeItem('applyflow_token');
        localStorage.removeItem('applyflow_refresh');
      } catch {}
      if (isMountedRef.current) {
        setUser(null);
        setAccessToken(null);
      }
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('applyflow_refresh', data.refreshToken);
    }
    localStorage.setItem('applyflow_user', JSON.stringify(data.user));
    setUser(data.user);
    toast.success(`Welcome back, ${data.user.name}!`);
    return data;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('applyflow_refresh', data.refreshToken);
    }
    localStorage.setItem('applyflow_user', JSON.stringify(data.user));
    setUser(data.user);
    toast.success('Account created successfully!');
    return data;
  };

  const logout = async () => {
    try {
      const storedRefresh = localStorage.getItem('applyflow_refresh') || undefined;
      await api.post('/auth/logout', { refreshToken: storedRefresh });
    } catch {
    } finally {
      try {
        localStorage.removeItem('applyflow_user');
        localStorage.removeItem('applyflow_token');
        localStorage.removeItem('applyflow_refresh');
      } catch {}
      setAccessToken(null);
      setUser(null);
      toast.success('Logged out.');
    }
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedUser };
      try {
        localStorage.setItem('applyflow_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
