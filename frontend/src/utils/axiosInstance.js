import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 15000,
});

// Request interceptor — tự thêm JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Nếu không phải form data thì set Content-Type JSON
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — nếu 401 thì logout
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear both token and the persisted user state to prevent infinite loops
      localStorage.removeItem('accessToken');
      localStorage.removeItem('eventhub-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
