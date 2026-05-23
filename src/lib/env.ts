const DEFAULT_API_BASE_URL = "https://api.chill.institute";
const trim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function getPublicAPIBaseURL() {
  const value = trim(import.meta.env.VITE_PUBLIC_API_BASE_URL);
  return value || DEFAULT_API_BASE_URL;
}
