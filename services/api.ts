/**
 * API Service for Admin Panel
 * Connects to Django REST Framework backend
 * Follows clean code: single responsibility, DRY, typed responses, optional cache for list endpoints.
 */

import type { LimitedAdmin, SystemBackup } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// ==================== Types ====================

/** Standard paginated list response from Django REST Framework */
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

/** API error with optional field-level errors (DRF validation) */
export interface ApiError extends Error {
  fields?: Record<string, string | string[]>;
}

// ==================== Helpers ====================

/** Build query string from params; skips null/undefined and empty values. */
function buildQueryString(params: Record<string, string | number | undefined | null> = {}): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/** Headers for unauthenticated requests (login, refresh). */
function getUnauthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  return headers;
}

/** Headers for authenticated requests (Bearer + API Key + Language). */
function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(API_KEY && { 'X-API-Key': API_KEY }),
    ...(uiLanguage === 'ar' || uiLanguage === 'en' ? { 'X-Language': uiLanguage } : {}),
    ...extra,
  };
}

/**
 * In-memory cache for frequently used list APIs to reduce duplicate network calls.
 * TTL in ms; invalidate via invalidateListCache() after mutations.
 */
const listCache = new Map<string, { data: unknown; expires: number }>();
const LIST_CACHE_TTL_MS = 60_000;

function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = listCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return Promise.resolve(cached.data as T);
  }
  return fetcher().then((data) => {
    listCache.set(key, { data, expires: Date.now() + LIST_CACHE_TTL_MS });
    return data;
  });
}

/** Call after create/update/delete on companies, plans, or subscriptions so list views stay fresh. */
export function invalidateListCache(resource?: 'companies' | 'plans' | 'subscriptions'): void {
  if (resource) {
    for (const key of listCache.keys()) {
      if (key.startsWith(resource)) listCache.delete(key);
    }
  } else {
    listCache.clear();
  }
}

/**
 * Authenticated API request with 401 refresh retry and consistent error shape.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOn401: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...Object.fromEntries(
      Object.entries(options.headers || {}).map(([k, v]) => [k, String(v)])
    ),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryOn401) {
    try {
      await refreshTokenAPI();
      return apiRequest<T>(endpoint, options, false);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('isAuthenticated');
      // Don't use window.location.href as it causes infinite refresh loop
      // Let the App component handle the redirect based on isAuthenticated state
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || errorData.error || 
                        JSON.stringify(errorData) || `API Error: ${response.status} ${response.statusText}`;
    console.error('API Error:', response.status, errorData);
    
    const error = new Error(errorMessage) as ApiError;
    if (errorData && typeof errorData === 'object') {
      const fieldErrors: Record<string, string | string[]> = {};
      Object.keys(errorData).forEach(key => {
        if (key !== 'detail' && key !== 'message' && key !== 'error') {
          const val = errorData[key];
          fieldErrors[key] = Array.isArray(val) ? val : String(val);
        }
      });
      if (Object.keys(fieldErrors).length > 0) error.fields = fieldErrors;
    }
    throw error;
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  
  try {
    return JSON.parse(text);
  } catch {
    return undefined as T;
  }
}

// ==================== Authentication APIs ====================

/**
 * Login - Get JWT tokens
 * POST /api/auth/login/
 */
export const loginAPI = async (username: string, password: string) => {
  const response = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: getUnauthHeaders(),
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || 'Invalid username or password';
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  // Store tokens
  if (data.access) {
    localStorage.setItem('accessToken', data.access);
  }
  if (data.refresh) {
    localStorage.setItem('refreshToken', data.refresh);
  }
  
  return data;
};

/**
 * Refresh access token
 * POST /api/auth/refresh/
 */
export const refreshTokenAPI = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: getUnauthHeaders(),
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  if (data.access) {
    localStorage.setItem('accessToken', data.access);
  }
  
  return data;
};

/**
 * Get current user
 * GET /api/users/me/
 */
export const getCurrentUserAPI = async () => {
  return apiRequest<any>('/users/me/');
};

// ==================== Companies (Tenants) APIs ====================

/**
 * Get all companies (tenants). Uses short-lived cache to avoid duplicate calls across pages.
 * GET /api/companies/
 */
export const getCompaniesAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  const cacheKey = `companies${query}`;
  return getCached(cacheKey, () =>
    apiRequest<PaginatedResponse<unknown>>(`/companies/${query}`)
  );
};

/**
 * Get company by ID
 * GET /api/companies/{id}/
 */
export const getCompanyAPI = async (id: number) => {
  return apiRequest<any>(`/companies/${id}/`);
};

/**
 * Create company
 * POST /api/companies/
 */
export const createCompanyAPI = async (companyData: any) => {
  const result = await apiRequest<any>('/companies/', {
    method: 'POST',
    body: JSON.stringify(companyData),
  });
  invalidateListCache('companies');
  return result;
};

/**
 * Update company
 * PUT /api/companies/{id}/
 */
export const updateCompanyAPI = async (id: number, companyData: any) => {
  const result = await apiRequest<any>(`/companies/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(companyData),
  });
  invalidateListCache('companies');
  return result;
};

/**
 * Delete company
 * DELETE /api/companies/{id}/
 */
export const deleteCompanyAPI = async (id: number) => {
  await apiRequest<void>(`/companies/${id}/`, {
    method: 'DELETE',
  });
  invalidateListCache('companies');
};

// ==================== Subscriptions APIs ====================

/**
 * Get all subscriptions. Uses short-lived cache to avoid duplicate calls across pages.
 * GET /api/subscriptions/
 */
export const getSubscriptionsAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  const cacheKey = `subscriptions${query}`;
  return getCached(cacheKey, () =>
    apiRequest<PaginatedResponse<unknown>>(`/subscriptions/${query}`)
  );
};

/**
 * Get subscription by ID
 * GET /api/subscriptions/{id}/
 */
export const getSubscriptionAPI = async (id: number) => {
  return apiRequest<any>(`/subscriptions/${id}/`);
};

/**
 * Create subscription
 * POST /api/subscriptions/
 */
export const createSubscriptionAPI = async (subscriptionData: any) => {
  const result = await apiRequest<any>('/subscriptions/', {
    method: 'POST',
    body: JSON.stringify(subscriptionData),
  });
  invalidateListCache('subscriptions');
  return result;
};

/**
 * Update subscription
 * PUT /api/subscriptions/{id}/
 */
export const updateSubscriptionAPI = async (id: number, subscriptionData: any) => {
  const result = await apiRequest<any>(`/subscriptions/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(subscriptionData),
  });
  invalidateListCache('subscriptions');
  return result;
};

/**
 * Delete subscription
 * DELETE /api/subscriptions/{id}/
 */
export const deleteSubscriptionAPI = async (id: number) => {
  await apiRequest<void>(`/subscriptions/${id}/`, {
    method: 'DELETE',
  });
  invalidateListCache('subscriptions');
};

// ==================== Plans APIs ====================

/**
 * Get all plans. Uses short-lived cache to avoid duplicate calls across pages.
 * GET /api/plans/
 */
export const getPlansAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  const cacheKey = `plans${query}`;
  return getCached(cacheKey, () =>
    apiRequest<PaginatedResponse<unknown>>(`/plans/${query}`)
  );
};

/**
 * Get plan by ID
 * GET /api/plans/{id}/
 */
export const getPlanAPI = async (id: number) => {
  return apiRequest<any>(`/plans/${id}/`);
};

/**
 * Create plan
 * POST /api/plans/
 */
export const createPlanAPI = async (planData: any) => {
  const payload = {
    ...planData,
    description_ar: planData.description_ar ?? planData.description ?? '',
    name_ar: planData.name_ar ?? planData.name ?? '',
  };
  const result = await apiRequest<any>('/plans/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  invalidateListCache('plans');
  return result;
};

/**
 * Update plan
 * PUT /api/plans/{id}/
 */
export const updatePlanAPI = async (id: number, planData: any) => {
  const payload = {
    ...planData,
    description_ar: planData.description_ar ?? planData.description ?? '',
    name_ar: planData.name_ar ?? planData.name ?? '',
  };
  const result = await apiRequest<any>(`/plans/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  invalidateListCache('plans');
  return result;
};

/**
 * Delete plan
 * DELETE /api/plans/{id}/
 */
export const deletePlanAPI = async (id: number) => {
  await apiRequest<void>(`/plans/${id}/`, {
    method: 'DELETE',
  });
  invalidateListCache('plans');
};

// ==================== Payments APIs ====================

/**
 * Get all payments
 * GET /api/payments/
 */
export const getPaymentsAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<unknown>>(`/payments/${query}`);
};

const SUCCESSFUL_PAYMENT_STATUSES = ['completed', 'successful', 'success'];

/**
 * Check if a company (tenant) has at least one successful payment.
 * Uses subscriptions for that company and payments list; returns false on API error to avoid blocking activation.
 */
export async function checkHasSuccessfulPaymentForCompany(tenantId: number): Promise<boolean> {
  try {
    const [subsRes, paymentsRes] = await Promise.all([getSubscriptionsAPI(), getPaymentsAPI()]);
    const subs = (subsRes.results || []) as { id: number; company: number }[];
    const companySubIds = new Set(subs.filter((s) => s.company === tenantId).map((s) => s.id));
    if (companySubIds.size === 0) return false;
    const payments = (paymentsRes.results || []) as { subscription: number; payment_status?: string }[];
    const status = (p: { payment_status?: string }) =>
      (p.payment_status || '').toLowerCase();
    return payments.some(
      (p) => companySubIds.has(p.subscription) && SUCCESSFUL_PAYMENT_STATUSES.includes(status(p))
    );
  } catch {
    return true; // On error, do not block activation (no warning dialog)
  }
}

/**
 * Check if a subscription has at least one successful payment.
 * Returns false on API error to avoid blocking activation.
 */
export async function checkHasSuccessfulPaymentForSubscription(subscriptionId: number): Promise<boolean> {
  try {
    const paymentsRes = await getPaymentsAPI();
    const payments = (paymentsRes.results || []) as { subscription: number; payment_status?: string }[];
    const status = (p: { payment_status?: string }) =>
      (p.payment_status || '').toLowerCase();
    return payments.some(
      (p) => p.subscription === subscriptionId && SUCCESSFUL_PAYMENT_STATUSES.includes(status(p))
    );
  } catch {
    return true; // On error, do not block activation
  }
}

/**
 * Get payment by ID
 * GET /api/payments/{id}/
 */
export const getPaymentAPI = async (id: number) => {
  return apiRequest<any>(`/payments/${id}/`);
};

/**
 * Create payment
 * POST /api/payments/
 */
export const createPaymentAPI = async (paymentData: any) => {
  return apiRequest<any>('/payments/', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
};

/**
 * Update payment
 * PUT /api/payments/{id}/
 */
export const updatePaymentAPI = async (id: number, paymentData: any) => {
  return apiRequest<any>(`/payments/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(paymentData),
  });
};

// ==================== Users APIs ====================

/**
 * Get all users (for admin)
 * GET /api/users/
 */
export const getUsersAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<unknown>>(`/users/${query}`);
};

/**
 * Impersonate a company owner (Super Admin only).
 * POST /api/auth/impersonate/
 * Body: { company_id?: number; user_id?: number }
 * Returns: { access, refresh, user, impersonated_by, impersonation_code }
 */
export const impersonateAPI = async (payload: { company_id?: number; user_id?: number }) => {
  return apiRequest<{
    access: string;
    refresh: string;
    user: any;
    impersonated_by: { id: number; username: string; email: string };
    impersonation_code: string;
  }>('/auth/impersonate/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Exchange one-time impersonation code for tokens (used by CRM app).
 * GET /api/auth/impersonate-exchange/?code=...
 */
export const impersonateExchangeAPI = async (code: string) => {
  const url = `${BASE_URL}/auth/impersonate-exchange/?code=${encodeURIComponent(code)}`;
  const response = await fetch(url, { method: 'GET', headers: getUnauthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Invalid or expired code');
  }
  return response.json();
};

/**
 * Change password
 * POST /api/users/change_password/
 */
export const changePasswordAPI = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
  return apiRequest<any>('/users/change_password/', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
};

/**
 * Check registration availability (domain, email, username, phone)
 * POST /api/auth/check-availability/
 */
export const checkRegistrationAvailabilityAPI = async (fields: {
  company_domain?: string;
  email?: string;
  username?: string;
  phone?: string;
}) => {
  return apiRequest<{ available: boolean }>('/auth/check-availability/', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
};

/**
 * Register company with owner (nested format, same as CRM-project)
 * POST /api/auth/register/
 * Body: { company: { name, domain, specialization }, owner: { first_name, last_name, email, username, password, phone }, plan_id?, billing_cycle? }
 */
export const registerCompanyAPI = async (data: {
  company: { name: string; domain: string; specialization: 'real_estate' | 'services' | 'products' };
  owner: { first_name: string; last_name: string; email: string; username: string; password: string; phone: string };
  plan_id?: number | null;
  billing_cycle?: 'monthly' | 'yearly';
}) => {
  const result = await apiRequest<any>('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  invalidateListCache('companies');
  return result;
};

// ==================== Invoices APIs ====================

/**
 * Get all invoices
 * GET /api/invoices/
 */
export const getInvoicesAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<unknown>>(`/invoices/${query}`);
};

/**
 * Get invoice by ID
 * GET /api/invoices/{id}/
 */
export const getInvoiceAPI = async (id: number) => {
  return apiRequest<any>(`/invoices/${id}/`);
};

/**
 * Create invoice
 * POST /api/invoices/
 */
export const createInvoiceAPI = async (invoiceData: any) => {
  return apiRequest<any>('/invoices/', {
    method: 'POST',
    body: JSON.stringify(invoiceData),
  });
};

/**
 * Update invoice
 * PUT /api/invoices/{id}/
 */
export const updateInvoiceAPI = async (id: number, invoiceData: any) => {
  return apiRequest<any>(`/invoices/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(invoiceData),
  });
};

/**
 * Mark invoice as paid
 * POST /api/invoices/{id}/mark_paid/
 */
export const markInvoicePaidAPI = async (id: number) => {
  return apiRequest<any>(`/invoices/${id}/mark_paid/`, {
    method: 'POST',
  });
};

// ==================== Broadcasts APIs ====================

/**
 * Get all broadcasts
 * GET /api/broadcasts/
 */
export const getBroadcastsAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<unknown>>(`/broadcasts/${query}`);
};

/**
 * Get broadcast by ID
 * GET /api/broadcasts/{id}/
 */
export const getBroadcastAPI = async (id: number) => {
  return apiRequest<any>(`/broadcasts/${id}/`);
};

/**
 * Create broadcast
 * POST /api/broadcasts/
 */
export const createBroadcastAPI = async (broadcastData: any) => {
  return apiRequest<any>('/broadcasts/', {
    method: 'POST',
    body: JSON.stringify(broadcastData),
  });
};

/**
 * Update broadcast
 * PUT /api/broadcasts/{id}/
 */
export const updateBroadcastAPI = async (id: number, broadcastData: any) => {
  return apiRequest<any>(`/broadcasts/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(broadcastData),
  });
};

/**
 * Delete broadcast
 * DELETE /api/broadcasts/{id}/
 */
export const deleteBroadcastAPI = async (id: number) => {
  return apiRequest<void>(`/broadcasts/${id}/`, {
    method: 'DELETE',
  });
};

/**
 * Send broadcast immediately
 * POST /api/broadcasts/{id}/send/
 */
export const sendBroadcastAPI = async (id: number) => {
  return apiRequest<any>(`/broadcasts/${id}/send/`, {
    method: 'POST',
  });
};

/**
 * Schedule broadcast
 * POST /api/broadcasts/{id}/schedule/
 */
export const scheduleBroadcastAPI = async (id: number, scheduledAt: string) => {
  return apiRequest<any>(`/broadcasts/${id}/schedule/`, {
    method: 'POST',
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
};

/**
 * Send SMS broadcast to targets (same as broadcast: all, plan_X, role_*, company_X).
 * POST /api/broadcasts/send-sms/
 */
export const sendSmsBroadcastAPI = async (body: { targets: string[]; content: string }) => {
  return apiRequest<{ sent_count: number; skipped_count: number }>('/broadcasts/send-sms/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// ==================== Payment Gateways APIs ====================

/**
 * Get all payment gateways
 * GET /api/payment-gateways/
 */
export const getPaymentGatewaysAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<unknown>>(`/payment-gateways/${query}`);
};

/**
 * Get payment gateway by ID
 * GET /api/payment-gateways/{id}/
 */
export const getPaymentGatewayAPI = async (id: number) => {
  return apiRequest<any>(`/payment-gateways/${id}/`);
};

/**
 * Create payment gateway
 * POST /api/payment-gateways/
 */
export const createPaymentGatewayAPI = async (gatewayData: any) => {
  return apiRequest<any>('/payment-gateways/', {
    method: 'POST',
    body: JSON.stringify(gatewayData),
  });
};

/**
 * Update payment gateway
 * PUT /api/payment-gateways/{id}/
 */
export const updatePaymentGatewayAPI = async (id: number, gatewayData: any) => {
  return apiRequest<any>(`/payment-gateways/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(gatewayData),
  });
};

/**
 * Delete payment gateway
 * DELETE /api/payment-gateways/{id}/
 */
export const deletePaymentGatewayAPI = async (id: number) => {
  return apiRequest<void>(`/payment-gateways/${id}/`, {
    method: 'DELETE',
  });
};

/**
 * Toggle payment gateway enabled status
 * POST /api/payment-gateways/{id}/toggle_enabled/
 */
export const togglePaymentGatewayAPI = async (id: number) => {
  return apiRequest<any>(`/payment-gateways/${id}/toggle_enabled/`, {
    method: 'POST',
  });
};

/**
 * Test payment gateway connection
 * POST /api/payment-gateways/{id}/test_connection/
 */
export const testPaymentGatewayConnectionAPI = async (id: number, config: any) => {
  return apiRequest<{ success: boolean; message: string }>(`/payment-gateways/${id}/test_connection/`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  });
};

// ==================== System Settings APIs ====================

/**
 * Get system backups
 * GET /api/settings/backups/
 */
export const getSystemBackupsAPI = async (params?: { page?: number }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<SystemBackup>>(`/settings/backups/${query}`);
};

/**
 * Trigger a new system backup
 * POST /api/settings/backups/
 */
export const createSystemBackupAPI = async (notes?: string) => {
  const payload = notes ? { notes } : {};
  return apiRequest<any>('/settings/backups/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Restore a backup
 * POST /api/settings/backups/{id}/restore/
 */
export const restoreSystemBackupAPI = async (id: string) => {
  return apiRequest<any>(`/settings/backups/${id}/restore/`, {
    method: 'POST',
  });
};

/**
 * Delete a backup
 * DELETE /api/settings/backups/{id}/
 */
export const deleteSystemBackupAPI = async (id: string) => {
  return apiRequest<void>(`/settings/backups/${id}/`, {
    method: 'DELETE',
  });
};

/**
 * Fetch backup file for download (returns raw Response for blob handling).
 * GET /api/settings/backups/{id}/download/
 */
/** Returns raw Response for blob download; uses shared auth headers. */
export async function getSystemBackupDownloadResponse(id: string): Promise<Response> {
  const headers = getAuthHeaders();
  return fetch(`${BASE_URL}/settings/backups/${id}/download/`, { headers });
}

/**
 * Get audit logs for system actions
 * GET /api/settings/audit-logs/
 */
export const getSystemAuditLogsAPI = async (params?: { page?: number }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<unknown>>(`/settings/audit-logs/${query}`);
};

// ==================== System Settings APIs ====================

/**
 * Get system settings
 * GET /api/settings/system/
 */
export const getSystemSettingsAPI = async () => {
  try {
    // Try to get the singleton instance (ID 1)
    const response = await apiRequest<any>('/settings/system/1/');
    return response;
  } catch (error: any) {
    // If 404, settings don't exist yet, return default
    if (error.message && error.message.includes('404')) {
      return { id: 1, usd_to_iqd_rate: 1300.00 };
    }
    throw error;
  }
};

/**
 * Update system settings (partial update supported)
 * PATCH /api/settings/system/1/ for partial, PUT for full
 */
export const updateSystemSettingsAPI = async (settingsData: {
  usd_to_iqd_rate?: number;
  backup_schedule?: 'daily' | 'weekly' | 'monthly';
}) => {
  return apiRequest<any>('/settings/system/1/', {
    method: 'PATCH',
    body: JSON.stringify(settingsData),
  });
};

/**
 * Get platform Twilio settings (for admin SMS broadcast).
 * GET /api/settings/platform-twilio/ or .../1/
 */
export const getPlatformTwilioSettingsAPI = async () => {
  try {
    const response = await apiRequest<any>('/settings/platform-twilio/1/');
    return response;
  } catch (error: any) {
    if (error.message && error.message.includes('404')) {
      return {
        id: 1,
        account_sid: '',
        twilio_number: '',
        auth_token_masked: null,
        sender_id: '',
        is_enabled: false,
      };
    }
    throw error;
  }
};

/**
 * Update platform Twilio settings.
 * PUT /api/settings/platform-twilio/1/
 */
export const updatePlatformTwilioSettingsAPI = async (data: {
  account_sid?: string;
  twilio_number?: string;
  auth_token?: string;
  sender_id?: string;
  is_enabled?: boolean;
}) => {
  return apiRequest<any>('/settings/platform-twilio/1/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// ==================== Limited Admins APIs ====================

/**
 * Get all limited admins
 * GET /api/limited-admins/
 */
export const getLimitedAdminsAPI = async (params?: { search?: string; ordering?: string }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<LimitedAdmin>>(`/limited-admins/${query}`);
};

/**
 * Get limited admin by ID
 * GET /api/limited-admins/{id}/
 */
export const getLimitedAdminAPI = async (id: number) => {
  return apiRequest<any>(`/limited-admins/${id}/`);
};

/**
 * Create limited admin
 * POST /api/limited-admins/
 */
export const createLimitedAdminAPI = async (adminData: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
  can_view_dashboard?: boolean;
  can_manage_tenants?: boolean;
  can_manage_subscriptions?: boolean;
  can_manage_payment_gateways?: boolean;
  can_view_reports?: boolean;
  can_manage_communication?: boolean;
  can_manage_settings?: boolean;
  can_manage_limited_admins?: boolean;
}) => {
  return apiRequest<any>('/limited-admins/', {
    method: 'POST',
    body: JSON.stringify(adminData),
  });
};

/**
 * Update limited admin
 * PUT /api/limited-admins/{id}/
 */
export const updateLimitedAdminAPI = async (id: number, adminData: any) => {
  return apiRequest<any>(`/limited-admins/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(adminData),
  });
};

/**
 * Delete limited admin
 * DELETE /api/limited-admins/{id}/
 */
export const deleteLimitedAdminAPI = async (id: number) => {
  return apiRequest<void>(`/limited-admins/${id}/`, {
    method: 'DELETE',
  });
};

/**
 * Toggle limited admin active status
 * POST /api/limited-admins/{id}/toggle_active/
 */
export const toggleLimitedAdminActiveAPI = async (id: number) => {
  return apiRequest<any>(`/limited-admins/${id}/toggle_active/`, {
    method: 'POST',
  });
};

/** GET /api/support-tickets/ - list all support tickets (super admin) */
export const getSupportTicketsAPI = async (params?: { page?: number; page_size?: number }) => {
  const query = buildQueryString(params ?? {});
  return apiRequest<PaginatedResponse<unknown>>(`/support-tickets/${query}`);
};

/** GET /api/support-tickets/{id}/ - get one ticket */
export const getSupportTicketAPI = async (id: number) => {
  return apiRequest<any>(`/support-tickets/${id}/`);
};

/** PATCH /api/support-tickets/{id}/ - update ticket status */
export const updateSupportTicketStatusAPI = async (id: number, data: { status: string }) => {
  return apiRequest<any>(`/support-tickets/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

