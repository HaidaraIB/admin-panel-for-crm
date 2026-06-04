export const DEFAULT_MAINTENANCE_MESSAGE_EN =
  'The system is under maintenance. Please try again later.';

export function resolveMaintenanceDisplayMessage(
  apiMessage: string,
  localizedFallback: string,
): string {
  const trimmed = (apiMessage || '').trim();
  if (!trimmed || trimmed === DEFAULT_MAINTENANCE_MESSAGE_EN) {
    return localizedFallback;
  }
  return trimmed;
}

export type MaintenanceRetryResult = 'online' | 'maintenance' | 'error';
