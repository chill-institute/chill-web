const DEFAULT_API_BASE_URL = "https://api.chill.institute";
const trim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function getPublicAPIBaseURL() {
  const value = trim(import.meta.env.VITE_PUBLIC_API_BASE_URL);
  return value || DEFAULT_API_BASE_URL;
}

export function getPublicStremioBaseURL() {
  const value = trim(import.meta.env.VITE_PUBLIC_STREMIO_BASE_URL);
  const url = new URL(value || "https://stremio.chill.institute");
  if (
    (url.protocol !== "https:" &&
      !(
        import.meta.env.DEV &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Invalid Stremio service configuration");
  }
  return url.origin;
}
