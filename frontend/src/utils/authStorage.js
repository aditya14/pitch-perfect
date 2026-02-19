const ACCESS_TOKEN_KEY = 'accessToken';

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token) => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return 'local';
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') {
      throw error;
    }
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    return 'session';
  }
};

export const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
};

