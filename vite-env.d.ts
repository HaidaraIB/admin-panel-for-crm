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
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  readonly VITE_REALTIME_ENABLED?: string;
  readonly VITE_REALTIME_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

