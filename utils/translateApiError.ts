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
  'Your subscription is not active or has expired. Please contact support or complete your payment to access the system.': 'errors.subscriptionExpired',
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
