/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Prefer canonical `.../api/v1` (or `.../api` — normalized at runtime). */
  readonly VITE_API_URL?: string;
  /** Must match server `API_KEY_ADMIN`. Falls back to `VITE_API_KEY`. */
  readonly VITE_API_KEY_ADMIN?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_CRM_APP_URL?: string;
  readonly VITE_BASE_DOMAIN?: string;
  readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

