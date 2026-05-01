import type { ApiError } from '../services/api';

/**
 * Maps known API error messages (English) to i18n keys so they display in the current UI language.
 */
const API_MESSAGE_TO_KEY: Record<string, string> = {
  'You do not have permission to view the dashboard.': 'errors.permissionViewDashboard',
  'You do not have permission to manage tenants.': 'errors.permissionManageTenants',
  'You do not have permission to manage subscriptions.': 'errors.permissionManageSubscriptions',
  'You do not have permission to manage plans.': 'errors.permissionManagePlans',
  'You do not have permission to manage payments.': 'errors.permissionManagePayments',
  'You do not have permission to manage payment gateways.': 'errors.permissionManagePaymentGateways',
  'You do not have permission to view reports.': 'errors.permissionViewReports',
  'You do not have permission to manage communication.': 'errors.permissionManageCommunication',
  'You do not have permission to manage settings.': 'errors.permissionManageSettings',
  'You do not have permission to manage limited admins.': 'errors.permissionManageLimitedAdmins',
  'You do not have permission to perform this action.': 'errors.permissionPerformAction',
  'Your subscription is not active or has expired. Please contact support or Complete Your Payment to access the system.': 'errors.subscriptionExpired',
  'Validation failed.': 'errors.validationFailed',
  'Selected channel is not configured.': 'errors.selectedChannelNotConfigured',
};

export function translateApiMessage(
  message: string | undefined,
  t: (key: string) => string
): string {
  if (!message || typeof message !== 'string') return '';
  const trimmed = message.replace(/^\.\s*/, '').trim();
  const key = API_MESSAGE_TO_KEY[trimmed];
  return key ? t(key) : message;
}

/**
 * Maps known English messages via translateApiMessage; if the server sent no message, uses error.code.
 */
export function translateAdminApiError(error: unknown, t: (key: string) => string): string {
  const e = error as Partial<ApiError> & { message?: string };
  const msg = (e.message || '').trim();
  if (msg) return translateApiMessage(msg, t);
  if (e.code === 'twilio_otp_not_configured') return t('errors.twilioOtpNotConfigured');
  if (e.code === 'whatsapp_otp_not_configured') return t('errors.whatsappOtpNotConfigured');
  if (e.code === 'phone_otp_misconfigured') return t('errors.phoneOtpMisconfigured');
  if (e.code === 'validation_error') return t('errors.validationFailed');
  if (e.code === 'permission_denied') return t('errors.permissionPerformAction');
  if (e.code === 'authentication_failed') return t('login.errorInvalidCredentials') || '';
  return '';
}
