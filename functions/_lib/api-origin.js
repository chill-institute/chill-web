const PRODUCTION_APP_HOSTS = new Set(["chill.institute", "www.chill.institute"]);
const STAGING_API_ORIGIN = "https://api.binge.institute";
const PRODUCTION_API_ORIGIN = "https://api.chill.institute";

export function resolveHostedAPIBaseURL(hostname) {
  const host = hostname.trim().toLowerCase();

  if (PRODUCTION_APP_HOSTS.has(host)) {
    return PRODUCTION_API_ORIGIN;
  }

  return STAGING_API_ORIGIN;
}
