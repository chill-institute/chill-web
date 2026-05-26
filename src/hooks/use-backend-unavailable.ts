import { useQuery } from "@tanstack/react-query";

import { getPublicAPIBaseURL } from "@/lib/env";

const HEALTHCHECK_TIMEOUT_MS = 2500;
const OUTAGE_POLL_INTERVAL_MS = 5000;

async function checkBackendHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${getPublicAPIBaseURL()}/healthz`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useBackendUnavailable() {
  const query = useQuery({
    queryKey: ["backend-health"],
    queryFn: checkBackendHealth,
    retry: false,
    staleTime: OUTAGE_POLL_INTERVAL_MS,
    refetchInterval: (health) => (health.state.data === false ? OUTAGE_POLL_INTERVAL_MS : false),
  });

  return {
    isBackendUnavailable: query.data === false,
    retry: query.refetch,
  };
}
