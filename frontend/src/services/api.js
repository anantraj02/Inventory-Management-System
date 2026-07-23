import axios from 'axios';
import { store } from '../redux/store';
import { loginSuccess, logoutUser } from '../redux/authSlice';

export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const BACKEND_HOST = BACKEND_URL.endsWith('/api') ? BACKEND_URL.slice(0, -4) : BACKEND_URL;

const API = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true // Send cookies (refresh token)
});

// Request Interceptor: Attach access token
API.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Auto refresh token on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 error and not a retry yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Avoid infinite loop if refreshing fails
      if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
        store.dispatch(logoutUser());
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return API(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request token refresh
        const res = await axios.post(`${BACKEND_URL}/auth/refresh`, {}, { withCredentials: true });
        
        const { accessToken, user } = res.data;
        
        // Save new token in redux
        store.dispatch(loginSuccess({ accessToken, user }));
        
        isRefreshing = false;
        processQueue(null, accessToken);

        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
        return API(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        
        // Log out user since refresh token expired or invalid
        store.dispatch(logoutUser());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
