/**
 * API Service for Admin Panel
 * Connects to Django REST Framework backend
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://haidaraib.pythonanywhere.com/api';

/**
 * Helper function to make API requests with JWT authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOn401: boolean = true
): Promise<T> {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
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
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || errorData.error || 
                        JSON.stringify(errorData) || `API Error: ${response.status} ${response.statusText}`;
    console.error('API Error:', response.status, errorData);
    throw new Error(errorMessage);
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
    headers: {
      'Content-Type': 'application/json',
    },
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
    headers: {
      'Content-Type': 'application/json',
    },
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
 * Get all companies (tenants)
 * GET /api/companies/
 */
export const getCompaniesAPI = async (params?: { search?: string; ordering?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/companies/${query ? `?${query}` : ''}`);
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
  return apiRequest<any>('/companies/', {
    method: 'POST',
    body: JSON.stringify(companyData),
  });
};

/**
 * Update company
 * PUT /api/companies/{id}/
 */
export const updateCompanyAPI = async (id: number, companyData: any) => {
  return apiRequest<any>(`/companies/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(companyData),
  });
};

/**
 * Delete company
 * DELETE /api/companies/{id}/
 */
export const deleteCompanyAPI = async (id: number) => {
  return apiRequest<void>(`/companies/${id}/`, {
    method: 'DELETE',
  });
};

// ==================== Subscriptions APIs ====================

/**
 * Get all subscriptions
 * GET /api/subscriptions/
 */
export const getSubscriptionsAPI = async (params?: { search?: string; ordering?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/subscriptions/${query ? `?${query}` : ''}`);
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
  return apiRequest<any>('/subscriptions/', {
    method: 'POST',
    body: JSON.stringify(subscriptionData),
  });
};

/**
 * Update subscription
 * PUT /api/subscriptions/{id}/
 */
export const updateSubscriptionAPI = async (id: number, subscriptionData: any) => {
  return apiRequest<any>(`/subscriptions/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(subscriptionData),
  });
};

/**
 * Delete subscription
 * DELETE /api/subscriptions/{id}/
 */
export const deleteSubscriptionAPI = async (id: number) => {
  return apiRequest<void>(`/subscriptions/${id}/`, {
    method: 'DELETE',
  });
};

// ==================== Plans APIs ====================

/**
 * Get all plans
 * GET /api/plans/
 */
export const getPlansAPI = async (params?: { search?: string; ordering?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/plans/${query ? `?${query}` : ''}`);
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
  return apiRequest<any>('/plans/', {
    method: 'POST',
    body: JSON.stringify(planData),
  });
};

/**
 * Update plan
 * PUT /api/plans/{id}/
 */
export const updatePlanAPI = async (id: number, planData: any) => {
  return apiRequest<any>(`/plans/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(planData),
  });
};

/**
 * Delete plan
 * DELETE /api/plans/{id}/
 */
export const deletePlanAPI = async (id: number) => {
  return apiRequest<void>(`/plans/${id}/`, {
    method: 'DELETE',
  });
};

// ==================== Payments APIs ====================

/**
 * Get all payments
 * GET /api/payments/
 */
export const getPaymentsAPI = async (params?: { search?: string; ordering?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/payments/${query ? `?${query}` : ''}`);
};

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
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/users/${query ? `?${query}` : ''}`);
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
 * Register company with admin user
 * POST /api/auth/register/
 */
export const registerCompanyAPI = async (companyData: {
  company_name: string;
  domain: string;
  specialization: string;
  admin_username: string;
  admin_email: string;
  admin_password: string;
  admin_first_name?: string;
  admin_last_name?: string;
}) => {
  return apiRequest<any>('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(companyData),
  });
};

// ==================== Invoices APIs ====================

/**
 * Get all invoices
 * GET /api/invoices/
 */
export const getInvoicesAPI = async (params?: { search?: string; ordering?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/invoices/${query ? `?${query}` : ''}`);
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
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/broadcasts/${query ? `?${query}` : ''}`);
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

// ==================== Payment Gateways APIs ====================

/**
 * Get all payment gateways
 * GET /api/payment-gateways/
 */
export const getPaymentGatewaysAPI = async (params?: { search?: string; ordering?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.ordering) queryParams.append('ordering', params.ordering);
  
  const query = queryParams.toString();
  return apiRequest<{ results: any[]; count: number }>(`/payment-gateways/${query ? `?${query}` : ''}`);
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

