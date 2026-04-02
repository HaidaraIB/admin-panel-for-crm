/**
 * Shared JSON envelope parsing for Django API (success/data, error/code/message/details).
 */

/** API error with optional field-level errors (unified envelope or legacy DRF) */
export interface ApiError extends Error {
  fields?: Record<string, string | string[]>;
  code?: string;
  status?: number;
  details?: unknown;
}

/**
 * Unwrap renderer / success_response body: { success: true, data: T } → T.
 * Passes through legacy JSON that is not enveloped.
 */
export function unwrapApiData<T>(parsed: unknown): T {
  if (parsed === null || parsed === undefined) return parsed as T;
  if (typeof parsed !== 'object') return parsed as T;
  const o = parsed as Record<string, unknown>;
  if (o.success === true && Object.prototype.hasOwnProperty.call(o, 'data')) {
    return o.data as T;
  }
  if (o.success === true) {
    return undefined as T;
  }
  return parsed as T;
}

function buildFieldErrorsFromValidationDetails(
  details: unknown
): Record<string, string | string[]> | undefined {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined;
  const det = details as Record<string, unknown>;
  const fe: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(det)) {
    if (k === 'non_field_errors') continue;
    if (Array.isArray(v)) fe[k] = v.map((x) => String(x));
    else if (v != null && typeof v === 'object') fe[k] = JSON.stringify(v);
    else if (v != null) fe[k] = String(v);
  }
  return Object.keys(fe).length ? fe : undefined;
}

/** Parse error JSON from backend (envelope or legacy). */
export function parseErrorPayload(
  errorData: unknown,
  httpStatus: number
): { message: string; code?: string; fields?: Record<string, string | string[]>; details?: unknown } {
  const fallback = `API Error: ${httpStatus}`;
  if (errorData === null || errorData === undefined) {
    return { message: fallback };
  }
  if (typeof errorData === 'string') {
    return { message: errorData };
  }
  if (typeof errorData !== 'object') {
    return { message: String(errorData) };
  }
  const d = errorData as Record<string, unknown>;

  if (d.success === false && d.error && typeof d.error === 'object') {
    const err = d.error as Record<string, unknown>;
    let message = String(err.message ?? fallback);
    const code = err.code != null ? String(err.code) : undefined;
    const details = err.details;
    const fields = buildFieldErrorsFromValidationDetails(details);
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      const nf = (details as Record<string, unknown>).non_field_errors;
      if (Array.isArray(nf) && nf.length) {
        message = nf.map(String).join(' ');
      }
    }
    return { message, code, fields, details };
  }

  if (typeof d.detail === 'string') {
    return { message: d.detail, details: d };
  }
  if (Array.isArray(d.detail) && d.detail.length) {
    return { message: d.detail.map(String).join(' '), details: d };
  }

  if (typeof d.message === 'string') {
    return {
      message: d.message,
      code: d.code != null ? String(d.code) : undefined,
      details: d,
    };
  }
  if (typeof d.error === 'string') {
    return { message: d.error, details: d };
  }

  const fields = buildFieldErrorsFromValidationDetails(d);
  const nf = d.non_field_errors;
  let message = fallback;
  if (Array.isArray(nf) && nf.length) message = nf.map(String).join(' ');
  else if (typeof d.detail === 'string') message = d.detail;

  return {
    message: fields && message === fallback ? 'Validation failed.' : message,
    fields,
    details: d,
  };
}

export function throwApiError(status: number, errorData: unknown): never {
  const { message, code, fields, details } = parseErrorPayload(errorData, status);
  const error = new Error(message || `API Error: ${status}`) as ApiError;
  error.status = status;
  if (code) error.code = code;
  if (details !== undefined) error.details = details;
  if (fields && Object.keys(fields).length > 0) error.fields = fields;
  throw error;
}

/** Human-readable message from parsed error JSON (e.g. blob download failures). */
export function messageFromParsedErrorBody(body: unknown, fallback: string): string {
  const { message } = parseErrorPayload(body, 0);
  if (message && message !== 'API Error: 0') return message;
  return fallback;
}

export function isApiNotFoundError(error: unknown): boolean {
  const e = error as ApiError;
  return e?.status === 404 || e?.code === 'not_found';
}
