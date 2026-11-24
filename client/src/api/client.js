import axios from 'axios';

let accessTokenMemory = (() => {
  try {
    return localStorage.getItem('applyflow_token') || null;
  } catch {
    return null;
  }
})();

export function setAccessToken(token) {
  accessTokenMemory = token;
  try {
    if (token) {
      localStorage.setItem('applyflow_token', token);
    } else {
      localStorage.removeItem('applyflow_token');
    }
  } catch {}
}

export function getAccessToken() {
  return accessTokenMemory;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (!accessTokenMemory) {
      try {
        accessTokenMemory = localStorage.getItem('applyflow_token') || null;
      } catch {}
    }
    if (accessTokenMemory) {
      config.headers.Authorization = `Bearer ${accessTokenMemory}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefresh = (() => {
          try {
            return localStorage.getItem('applyflow_refresh') || undefined;
          } catch {
            return undefined;
          }
        })();

        const { data } = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken: storedRefresh },
          { withCredentials: true }
        );
        const newToken = data.accessToken;
        setAccessToken(newToken);
        if (data.refreshToken) {
          try {
            localStorage.setItem('applyflow_refresh', data.refreshToken);
          } catch {}
        }
        if (data.user) {
          try {
            localStorage.setItem('applyflow_user', JSON.stringify(data.user));
          } catch {}
        }
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        try {
          localStorage.removeItem('applyflow_token');
          localStorage.removeItem('applyflow_refresh');
          localStorage.removeItem('applyflow_user');
        } catch {}
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
