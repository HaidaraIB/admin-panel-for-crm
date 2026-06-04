import { ADMIN_API_BASE_URL, ADMIN_API_KEY } from './httpClient';
import { unwrapApiData } from './apiEnvelope';

export type MaintenanceStatus = {
  maintenance_mode: boolean;
  message: string;
};

export async function fetchMaintenanceStatus(): Promise<MaintenanceStatus> {
  const headers: Record<string, string> = {};
  if (ADMIN_API_KEY) headers['X-API-Key'] = ADMIN_API_KEY;
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  if (uiLanguage === 'ar' || uiLanguage === 'en') {
    headers['X-Language'] = uiLanguage;
  }
  const response = await fetch(`${ADMIN_API_BASE_URL}/public/maintenance-status/`, { headers });
  const raw: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Failed to fetch maintenance status');
  }
  return unwrapApiData<MaintenanceStatus>(raw);
}
