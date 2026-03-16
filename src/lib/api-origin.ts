const PRODUCTION_APP_HOSTS = new Set(["chill.institute", "www.chill.institute"]);
const PRODUCTION_API_BASE_URL = "https://api.chill.institute";
const PREVIEW_HOST = "web-8vr.pages.dev";
const PREVIEW_HOST_SUFFIX = ".web-8vr.pages.dev";

export function resolveHostedAPIBaseURL(hostname: string, currentOrigin?: string) {
  const host = hostname.trim().toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === PREVIEW_HOST ||
    host.endsWith(PREVIEW_HOST_SUFFIX) ||
    PRODUCTION_APP_HOSTS.has(host)
  ) {
    return PRODUCTION_API_BASE_URL;
  }

  if (host === "api.chill.institute" && currentOrigin) {
    return currentOrigin;
  }

  return null;
}
