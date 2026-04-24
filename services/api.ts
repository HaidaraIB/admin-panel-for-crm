/**
 * API Service for Admin Panel — uses shared Axios client (services/httpClient.ts):
 * /api/v1/, X-API-Key (admin), JWT, envelope unwrap.
 */

import type { LimitedAdmin, SystemBackup } from '../types';
import { messageFromParsedErrorBody, isApiNotFoundError } from './apiEnvelope';
import {
  adminHttp,
  ADMIN_API_BASE_URL,
  refreshTokensViaFetch,
  buildAdminFetchHeaders,
} from './httpClient';
import type { BillingBranding } from '../types';

export {
  unwrapApiData,
  parseErrorPayload,
  messageFromParsedErrorBody,
  isApiNotFoundError,
} from './apiEnvelope';
export type { ApiError } from './apiEnvelope';
export { adminHttp, ADMIN_API_BASE_URL, normalizeAdminApiBaseUrl } from './httpClient';

// ==================== Types ====================

/** Standard paginated list response from Django REST Framework (after envelope unwrap: inside `data`). */
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string | null;
  previous?: string | null;
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

/** JSON API request via shared Axios client (interceptor: unwrap + 401 refresh). */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const path = endpoint.replace(/^\//, '');
  const method = (options.method || 'GET').toUpperCase();
  let data: unknown = undefined;
  if (options.body && typeof options.body === 'string' && options.body.length) {
    try {
      data = JSON.parse(options.body) as unknown;
    } catch {
      data = options.body;
    }
  }
  const extraHeaders = options.headers
    ? Object.fromEntries(Object.entries(options.headers).map(([k, v]) => [k, String(v)]))
    : undefined;

  const res = await adminHttp.request<T>({
    url: path,
    method,
    data:
      method !== 'GET' && method !== 'HEAD' && method !== 'DELETE' && data !== undefined
        ? data
        : undefined,
    headers: extraHeaders,
  });
  return res.data as T;
}

// ==================== Authentication APIs ====================

/**
 * Login - Get JWT tokens
 * POST .../auth/login/
 */
export const loginAPI = async (username: string, password: string) => {
  const res = await adminHttp.post<{ access?: string; refresh?: string; user?: unknown }>(
    'auth/login/',
    { username, password }
  );
  const data = res.data;
  if (data?.access) localStorage.setItem('accessToken', data.access);
  if (data?.refresh) localStorage.setItem('refreshToken', data.refresh);
  return data;
};

/**
 * Refresh access token (also used by Axios 401 interceptor via refreshTokensViaFetch).
 */
export const refreshTokenAPI = async () => {
  await refreshTokensViaFetch();
  return { access: localStorage.getItem('accessToken') ?? undefined };
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
  const res = await adminHttp.get('auth/impersonate-exchange/', {
    params: { code },
  });
  return res.data;
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

/** POST /companies/{id}/admin-whatsapp/send/ */
export const sendAdminTenantWhatsAppAPI = async (companyId: number, message: string) => {
  return apiRequest<{ whatsapp_message_id?: string | null }>(
    `/companies/${companyId}/admin-whatsapp/send/`,
    {
      method: 'POST',
      body: JSON.stringify({ message }),
    }
  );
};

/** GET /companies/{id}/admin-whatsapp/messages/ */
export const getAdminTenantWhatsAppMessagesAPI = async (
  companyId: number,
  params?: { page?: number; page_size?: number }
) => {
  const q = buildQueryString({
    page: params?.page,
    page_size: params?.page_size,
  });
  return apiRequest<{
    count: number;
    page: number;
    page_size: number;
    results: unknown[];
  }>(`/companies/${companyId}/admin-whatsapp/messages/${q}`)
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

/** GET /api/invoices/{id}/pdf/ — raw PDF (not JSON envelope), language-aware via X-Language header. */
export const downloadInvoicePdfAPI = async (id: number, language?: string): Promise<Blob> => {
  const res = await adminHttp.get<Blob>(`invoices/${id}/pdf/`, {
    responseType: 'blob',
    headers: language ? { 'X-Language': language } : undefined,
  });
  return res.data;
};

/** POST /api/invoices/{id}/send-email/ */
export const sendInvoiceEmailAPI = async (id: number, to?: string) => {
  return apiRequest<{ status?: string; message?: string }>(`invoices/${id}/send-email/`, {
    method: 'POST',
    body: JSON.stringify(to ? { to } : {}),
  });
};

/** GET /api/settings/billing/1/ */
export const getBillingSettingsAPI = async (): Promise<BillingBranding & { id?: number }> => {
  return apiRequest<BillingBranding & { id?: number }>('settings/billing/1/');
};

/** PATCH /api/settings/billing/1/ (multipart when uploading logo). */
export const updateBillingSettingsAPI = async (formData: FormData) => {
  const res = await adminHttp.patch('settings/billing/1/', formData);
  return res.data;
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
/** Returns raw Response for blob download; uses admin API key + JWT. */
export async function getSystemBackupDownloadResponse(id: string): Promise<Response> {
  return fetch(`${ADMIN_API_BASE_URL}/settings/backups/${id}/download/`, {
    headers: buildAdminFetchHeaders(),
  });
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
  } catch (error: unknown) {
    if (isApiNotFoundError(error)) {
      return { id: 1, usd_to_iqd_rate: 1300.0 };
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
  mobile_minimum_version_android?: string;
  mobile_minimum_version_ios?: string;
  mobile_minimum_build_android?: number | null;
  mobile_minimum_build_ios?: number | null;
  mobile_store_url_android?: string;
  mobile_store_url_ios?: string;
  integration_policies?: Record<string, {
    global_enabled?: boolean;
    global_message?: string;
    company_overrides?: Record<string, { enabled?: boolean; message?: string }>;
  }>;
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
  } catch (error: unknown) {
    if (isApiNotFoundError(error)) {
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

/** GET /auth/register/phone-otp-requirement/ */
export const getPhoneOtpRequirementAPI = async () => {
  return apiRequest<{ phone_otp_required: boolean }>(
    '/auth/register/phone-otp-requirement/'
  );
};

/** POST /auth/register/phone-otp-requirement/ */
export const updatePhoneOtpRequirementAPI = async (phoneOtpRequired: boolean) => {
  return apiRequest<{ phone_otp_required: boolean }>('/auth/register/phone-otp-requirement/', {
    method: 'POST',
    body: JSON.stringify({ phone_otp_required: phoneOtpRequired }),
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

