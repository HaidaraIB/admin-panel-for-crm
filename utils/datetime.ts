/**
 * Bridges `<input type="datetime-local">` (admin's local wall-clock time, no zone)
 * and the API's ISO-8601 UTC timestamps.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO (any zone) -> "YYYY-MM-DDTHH:mm" in the browser's local time; '' for empty/invalid. */
export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" local -> ISO UTC; null for empty/invalid. */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Short IANA zone label for hints, e.g. "Asia/Baghdad". */
export function localTimeZoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** Localized "Nov 30, 23:59" with Latin digits (house style). */
export function formatDateTimeShort(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
