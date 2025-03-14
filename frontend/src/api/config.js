// API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const config = {
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
};