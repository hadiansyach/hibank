import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Crypto from 'expo-crypto';
import { APP_CONFIG } from '@/core/config/env';
import { SecureStorage } from '@/core/security/secure-storage';
import { AppError, BackendErrorResponse } from '@/core/errors/app-error';

// Event listener for unauthorized session expiration
type UnauthorizedListener = () => void;
const unauthorizedListeners: Set<UnauthorizedListener> = new Set();

export const subscribeToUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

const notifyUnauthorized = () => {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[ApiClient] Error in unauthorized listener', e);
    }
  });
};

export const apiClient = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Token, Request ID, and Idempotency Key
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1. Generate unique X-Request-Id for distributed tracing
    const requestId = Crypto.randomUUID();
    config.headers.set('X-Request-Id', requestId);

    // 2. Attach Bearer token from hardware SecureStore if available
    const sessionToken = await SecureStorage.getItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    if (sessionToken && !config.headers.has('Authorization')) {
      config.headers.set('Authorization', `Bearer ${sessionToken}`);
    }

    // 3. For financial mutation endpoints (transfer, topup), ensure Idempotency-Key is set
    const url = config.url || '';
    const isMutation = (config.method?.toUpperCase() === 'POST' || config.method?.toUpperCase() === 'PUT') &&
      (url.includes('/transfer') || url.includes('/topup'));

    if (isMutation && !config.headers.has('Idempotency-Key')) {
      config.headers.set('Idempotency-Key', Crypto.randomUUID());
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardized Error Normalization, Silent Refresh & 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorResponse>) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (!error.response) {
      return Promise.reject(AppError.networkError(error.message));
    }

    const { status, data } = error.response;
    const errorCode = data?.error?.code;

    // Handle 401 Unauthorized
    if (status === 401 && originalRequest) {
      // 1. If TOKEN_EXPIRED: Trigger silent session refresh & sliding window extension
      if (errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await SecureStorage.getItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
          const currentToken = await SecureStorage.getItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
          const tokenToUse = refreshToken || currentToken;
          if (!tokenToUse) {
            throw new Error('No session or refresh token available for refresh');
          }

          // Call refresh endpoint directly using raw axios to avoid interceptor recursion
          const refreshRes = await axios.post<{
            session_token: string;
            refresh_token?: string;
            access_token?: string;
            token_type: string;
            expires_in: number;
          }>(
            `${APP_CONFIG.API_BASE_URL}/v1/auth/refresh`,
            {
              refresh_token: tokenToUse,
              session_token: currentToken || tokenToUse,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
              },
              timeout: APP_CONFIG.API_TIMEOUT_MS,
            }
          );

          const newToken = refreshRes.data.session_token || refreshRes.data.access_token || currentToken;
          if (newToken) {
            await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, newToken);
          }
          if (refreshRes.data.refresh_token) {
            await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshRes.data.refresh_token);
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          originalRequest.headers.set('Authorization', `Bearer ${newToken}`);

          processQueue(null, newToken);
          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
          await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
          await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
          notifyUnauthorized();
          return Promise.reject(AppError.unauthorized('Sesi Anda telah kedaluwarsa. Silakan masuk kembali.'));
        } finally {
          isRefreshing = false;
        }
      }

      // 2. Token reuse detection (Security Alert), invalid token, or expired retry
      if (
        errorCode === 'TOKEN_REUSE_DETECTED' ||
        errorCode === 'INVALID_TOKEN' ||
        errorCode === 'UNAUTHORIZED' ||
        originalRequest._retry
      ) {
        await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
        await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
        notifyUnauthorized();

        const message =
          errorCode === 'TOKEN_REUSE_DETECTED'
            ? 'Peringatan Keamanan: Sesi Anda digunakan di perangkat lain atau tidak sah. Anda telah dikeluarkan.'
            : 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.';
        return Promise.reject(AppError.unauthorized(message));
      }
    }

    if (data && data.error) {
      return Promise.reject(AppError.fromBackend(data.error, status));
    }

    return Promise.reject(
      new AppError(error.message || 'Terjadi kesalahan pada server', {
        statusCode: status,
      })
    );
  }
);

// Health and Readiness probes matching API.md Section 5.1
export interface HealthStatus {
  status: string;
  service: string;
}

export interface ReadyStatus {
  status: string;
  service: string;
  database: string;
}

export const checkHealth = async (): Promise<HealthStatus> => {
  const res = await apiClient.get<HealthStatus>('/healthz');
  return res.data;
};

export const checkReadiness = async (): Promise<ReadyStatus> => {
  const res = await apiClient.get<ReadyStatus>('/readyz');
  return res.data;
};

