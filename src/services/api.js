import axios from 'axios';
import Config from 'react-native-config';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = Config.API_BASE_URL || 'https://spend-hive-api.vercel.app/api';
const TOKEN_ENDPOINT = Config.TOKEN_ENDPOINT || '/get-access-token';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Separate Axios instance for token requests
// Prevents the refresh request from triggering the same interceptor.
const tokenApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let deviceIdPromise;
let refreshPromise;

// Get the device ID
const getDeviceId = () => {
  if (!deviceIdPromise) {
    deviceIdPromise = DeviceInfo.getUniqueId().catch((error) => {
      deviceIdPromise = null;
      throw error;
    });
  }

  return deviceIdPromise;
};

// Add client-id and token headers to every request
api.interceptors.request.use(
  async (config) => {
    const deviceId = await getDeviceId();

    config.headers = config.headers || {};
    config.headers['client-id'] = deviceId;

    const token = await AsyncStorage.getItem('access_token');

    if (token) {
      config.headers['token'] = token;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses and refresh the access token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url === TOKEN_ENDPOINT
    ) {
      return Promise.reject(error);
    }

    // Prevent infinite retry loops
    originalRequest._retry = true;

    try {
      // Reuse one refresh request when multiple APIs return 401
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const deviceId = await getDeviceId();

          const response = await tokenApi.post(
            TOKEN_ENDPOINT,
            {},
            {
              headers: {
                'client-id': deviceId,
              },
            }
          );

          const newToken = response.data?.data?.token;

          if (!newToken) {
            throw new Error(
              'Access token missing from token API response'
            );
          }

          await AsyncStorage.setItem('access_token', newToken);

          return newToken;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      const deviceId = await getDeviceId();

      // Retry the original request with the new token
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers['client-id'] = deviceId;
      originalRequest.headers['token'] = newToken;

      return api(originalRequest);
    } catch (refreshError) {
      await AsyncStorage.removeItem('access_token');

      return Promise.reject(refreshError);
    }
  }
);

export default api;