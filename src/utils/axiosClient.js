import axios from 'axios';

function isLocalhostHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalhostUrl(url) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|::1)(:\d+)?(\/|$)/i.test(url);
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
  if (configuredBaseUrl) {
    if (import.meta.env.PROD && isLocalhostUrl(configuredBaseUrl)) {
      return undefined;
    }

    return configuredBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (isLocalhostHost(hostname)) {
      return 'http://localhost:4000/vocabup-api';
    }

    return `${origin}/vocabup-api`;
  }

  return '/vocabup-api';
}

const resolvedApiBaseUrl = resolveApiBaseUrl();

const axiosClient = axios.create({
  baseURL: resolvedApiBaseUrl || '/vocabup-api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosClient.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');

    if (!token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          token = userObj?.token || userObj?.stsTokenManager?.accessToken;
        } catch (error) {
          console.error('Error parsing user object from localStorage:', error);
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      return response.data.data !== undefined ? response.data.data : response.data;
    }

    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request. Clearing local session and redirecting to login.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));

        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
