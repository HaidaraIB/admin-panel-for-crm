export const ADMIN_MAINTENANCE_EVENT = 'admin-maintenance-mode';

export function notifyAdminMaintenanceMode(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ADMIN_MAINTENANCE_EVENT, { detail: { message } }),
  );
}

export function subscribeAdminMaintenanceMode(
  listener: (message: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ message?: string }>).detail;
    listener(detail?.message || '');
  };
  window.addEventListener(ADMIN_MAINTENANCE_EVENT, handler);
  return () => window.removeEventListener(ADMIN_MAINTENANCE_EVENT, handler);
}
