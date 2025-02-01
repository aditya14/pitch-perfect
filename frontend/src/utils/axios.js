import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api'
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    // Debug log
    console.log('Request Config:', {
      url: config.url,
      method: config.method,
      token: token ? token.substring(0, 20) + '...' : 'no token'
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log the full error response
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: {
        request: error.config?.headers,
        response: error.response?.headers
      }
    });
    return Promise.reject(error);
  }
);

export default api;