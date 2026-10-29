import axios from 'axios';

/**
 * Centralized Axios API client.
 * All API calls should use this instance to ensure consistent
 * base URL, headers, and error handling.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies for HttpOnly JWT
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Auth token from cookie is handled automatically with withCredentials
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Return the data payload directly
    return response.data;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    const code = error.response?.data?.code || 'NETWORK_ERROR';
    const status = error.response?.status || 0;

    // Create a structured error
    const apiError = new Error(message);
    apiError.code = code;
    apiError.status = status;
    apiError.errors = error.response?.data?.errors || [];

    // Handle 401 — redirect to login if not already there
    if (status === 401 && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }

    return Promise.reject(apiError);
  }
);

export default api;
