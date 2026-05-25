import axios from 'axios';

// Create an Axios instance with base URL pointing to /api
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true, // Enables sending and receiving HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Response interceptor to handle token refresh automatically on HTTP 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh handling for login or refresh calls to prevent infinite loops
    if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        api.post('/auth/refresh')
          .then((res) => {
            processQueue(null, res.data);
            resolve(api(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            // Clear credentials and redirect to login page
            window.location.href = '/login';
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
