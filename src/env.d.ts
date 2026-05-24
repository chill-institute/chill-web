interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly VITE_PUBLIC_API_BASE_URL?: string;
  readonly VITE_PUBLIC_RELEASE?: string;
  readonly VITE_PUBLIC_SENTRY_DSN?: string;
  readonly VITE_PUBLIC_SENTRY_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
