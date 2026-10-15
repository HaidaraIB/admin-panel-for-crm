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
import { notifyAdminMaintenanceMode } from '../utils/maintenanceMode';

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

/** One redirect per page load. Parallel 401s must not each call location.replace. */
let sessionRedirecting = false;

/**
 * Drop the session and leave for login once.
 * Skipped when already on /login so a failed refresh cannot bounce with the dashboard route.
 */
export function expireAdminSession(): void {
  clearAuthStorage();
  if (typeof window === 'undefined') return;
  if (sessionRedirecting) return;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/login') return;
  sessionRedirecting = true;
  window.location.replace('/login');
}

const ACCESS_TOKEN_REFRESH_LEAD_SECONDS = 60;

/** Shared so concurrent 401s rotate the refresh token once. A second refresh blacklists it. */
let refreshInFlight: Promise<void> | null = null;

function jwtExpSeconds(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function accessTokenExpiresWithinSeconds(token: string, withinSec: number): boolean {
  const exp = jwtExpSeconds(token);
  if (exp == null) return false;
  return exp * 1000 <= Date.now() + withinSec * 1000;
}

async function performTokenRefresh(): Promise<void> {
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
  const data = unwrapApiData<{ access?: string; refresh?: string }>(raw);
  if (data?.access) localStorage.setItem('accessToken', data.access);
  if (data?.refresh) localStorage.setItem('refreshToken', data.refresh);
}

/**
 * Refresh tokens without using adminHttp response chain (avoids interceptor loops).
 * Callers share one in-flight request so rotation + blacklist cannot wipe the new token.
 */
export async function refreshTokensViaFetch(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = performTokenRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Renew the access token shortly before it expires. Failures are left for the 401 path. */
async function ensureAccessTokenFresh(): Promise<void> {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('accessToken');
  const refresh = localStorage.getItem('refreshToken');
  if (!token || !refresh) return;
  if (!accessTokenExpiresWithinSeconds(token, ACCESS_TOKEN_REFRESH_LEAD_SECONDS)) return;
  await refreshTokensViaFetch();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void ensureAccessTokenFresh().catch(() => {
        /* refresh failure handled on the next 401 */
      });
    }
  });
}

function isAuthNoRetryPath(path: string): boolean {
  return (
    path.includes('auth/login') ||
    path.includes('auth/refresh') ||
    path.includes('auth/impersonate-exchange')
  );
}

export const adminHttp = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

adminHttp.interceptors.request.use(async (config) => {
  const path = config.url || '';
  if (!isAuthNoRetryPath(path)) {
    try {
      await ensureAccessTokenFresh();
    } catch {
      /* refresh failure handled on the next 401 */
    }
  }
  Object.assign(config.headers, authHeaderParts());
  // Default instance header is application/json; FormData must use multipart with boundary.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const hdrs = config.headers;
    if (hdrs && typeof hdrs.delete === 'function') {
      hdrs.delete('Content-Type');
    } else if (hdrs) {
      Reflect.deleteProperty(hdrs as object, 'Content-Type');
    }
  }
  return config;
});

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
      const code = parseErrorPayload(error.response?.data, status).code;
      if (code === 'missing_api_key' || code === 'invalid_api_key') {
        throwApiError(status, error.response?.data);
      }
      originalRequest._retry = true;
      try {
        await refreshTokensViaFetch();
        return adminHttp.request(originalRequest);
      } catch {
        expireAdminSession();
        throw new Error('Session expired. Please login again.');
      }
    }

    const payload = error.response?.data;
    const st = error.response?.status ?? 500;
    if (payload !== undefined) {
      if (st === 503) {
        const parsed = parseErrorPayload(payload, st);
        if (parsed.code === 'maintenance_mode') {
          notifyAdminMaintenanceMode(parsed.message);
        }
      }
      throwApiError(st, payload);
    }

    const fallback = new Error(error.message || 'Network error') as ApiError;
    fallback.status = st;
    throw fallback;
  }
);
