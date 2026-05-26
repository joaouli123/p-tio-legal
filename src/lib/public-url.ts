const FALLBACK_PUBLIC_APP_URL = "https://app.patiolegalmaringasat.com.br";

export const DEFAULT_PUBLIC_URL = (
  import.meta.env.VITE_PUBLIC_APP_URL?.trim() || FALLBACK_PUBLIC_APP_URL
).replace(/\/+$/, "");
