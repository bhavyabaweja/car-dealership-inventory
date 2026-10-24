/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CURRENCY?: string;
  readonly VITE_LOCALE?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
