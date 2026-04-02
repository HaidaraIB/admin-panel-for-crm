/**
 * Single Axios client for the admin panel: base URL /api/v1/, X-API-Key (admin), JWT, unwrap envelope.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  unwrapApiData,
  parseErrorPayload,
  throwApiError,
  type ApiError,
} from './apiEnvelope';

/** Prefer canonical /api/v1/; accepts legacy VITE_API_URL ending in /api. */
export function normalizeAdminApiBaseUrl(raw: string): string {
  if (!raw) return '';
  const u = raw.trim().replace(/\/+$/, '');
  if (/\/api\/v\d+$/i.test(u)) return u;
  if (/\/api$/i.test(u)) return `${u}/v1`;
  return `${u}/api/v1`;
}

const rawBase = import.meta.env.VITE_API_URL || '';
export const ADMIN_API_BASE_URL = normalizeAdminApiBaseUrl(rawBase);

/** Must match server API_KEY_ADMIN (fallback: legacy VITE_API_KEY). */
export const ADMIN_API_KEY =
  import.meta.env.VITE_API_KEY_ADMIN || import.meta.env.VITE_API_KEY || '';

function authHeaderParts(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (ADMIN_API_KEY) h['X-API-Key'] = ADMIN_API_KEY;
  if (uiLanguage === 'ar' || uiLanguage === 'en') h['X-Language'] = uiLanguage;
  return h;
}

export function buildAdminFetchHeaders(): Record<string, string> {
  return {
    ...authHeaderParts(),
  };
}

function clearAuthStorage(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('isAuthenticated');
  sessionStorage.removeItem('isAuthenticated');
}

/**
 * Refresh tokens without using adminHttp response chain (avoids interceptor loops).
 */
export async function refreshTokensViaFetch(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token available');

  const res = await fetch(`${ADMIN_API_BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ADMIN_API_KEY ? { 'X-API-Key': ADMIN_API_KEY } : {}),
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { message } = parseErrorPayload(raw, res.status);
    throw new Error(message || 'Failed to refresh token');
  }
  const data = unwrapApiData<{ access?: string }>(raw);
  if (data?.access) localStorage.setItem('accessToken', data.access);
}

export const adminHttp = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

adminHttp.interceptors.request.use((config) => {
  Object.assign(config.headers, authHeaderParts());
  return config;
});

function isAuthNoRetryPath(path: string): boolean {
  return (
    path.includes('auth/login') ||
    path.includes('auth/refresh') ||
    path.includes('auth/impersonate-exchange')
  );
}

adminHttp.interceptors.response.use(
  (response) => {
    if (response.status === 204 || response.status === 205) {
      response.data = undefined;
      return response;
    }
    if (response.status >= 200 && response.status < 300) {
      response.data = unwrapApiData(response.data);
      return response;
    }
    throwApiError(response.status, response.data);
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const path = originalRequest?.url || '';

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthNoRetryPath(path)) {
      originalRequest._retry = true;
      try {
        await refreshTokensViaFetch();
        return adminHttp.request(originalRequest);
      } catch {
        clearAuthStorage();
        throw new Error('Session expired. Please login again.');
      }
    }

    const payload = error.response?.data;
    const st = error.response?.status ?? 500;
    if (payload !== undefined) {
      throwApiError(st, payload);
    }

    const fallback = new Error(error.message || 'Network error') as ApiError;
    fallback.status = st;
    throw fallback;
  }
);
