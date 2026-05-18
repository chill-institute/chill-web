const PRODUCTION_APP_DOMAIN = "chill.institute";
const PRODUCTION_API_BASE_URL = "https://api.chill.institute";

const STAGING_APP_HOSTS = new Set(["staging.chill.institute"]);
const STAGING_API_BASE_URL = "https://staging-api.chill.institute";

function isProductionAppHost(host: string) {
  return host === PRODUCTION_APP_DOMAIN || host.endsWith(`.${PRODUCTION_APP_DOMAIN}`);
}

export function resolveHostedAPIBaseURL(hostname: string, currentOrigin?: string) {
  const host = hostname.trim().toLowerCase();

  if (STAGING_APP_HOSTS.has(host)) {
    return STAGING_API_BASE_URL;
  }

  if (host === "api.chill.institute" && currentOrigin) {
    return currentOrigin;
  }

  if (host === "localhost" || host === "127.0.0.1" || isProductionAppHost(host)) {
    return PRODUCTION_API_BASE_URL;
  }

  return null;
}
