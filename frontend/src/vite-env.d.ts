/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GEOAPIFY_PUBLIC_KEY?: string;
  readonly VITE_ADMIN_ENABLED?: string;
  readonly VITE_SITE_HOLDING_PAGE?: string;
  readonly VITE_SUPPORT_WHATSAPP_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
