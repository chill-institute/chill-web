const DEFAULT_API_BASE_URL = "https://api.chill.institute";
const productionBaseURLs = new Map([
  [
    "chill.institute",
    { api: "https://api.chill.institute", stremio: "https://stremio.chill.institute" },
  ],
  [
    "binge.institute",
    { api: "https://api.binge.institute", stremio: "https://stremio.binge.institute" },
  ],
]);
const trim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function getPageHostname() {
  return typeof window === "undefined" ? "" : window.location.hostname;
}

export function getPublicAPIBaseURL() {
  const productionURL = productionBaseURLs.get(getPageHostname())?.api;
  if (productionURL) return productionURL;
  const value = trim(import.meta.env.VITE_PUBLIC_API_BASE_URL);
  return value || DEFAULT_API_BASE_URL;
}

export function getPublicStremioBaseURL() {
  const productionURL = productionBaseURLs.get(getPageHostname())?.stremio;
  if (productionURL) return productionURL;
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
