const preloadRecoveryParam = "__chill_reload";
const sessionStorageProbeKey = "chill.preload-recovery-probe.v1";
const tanstackReloadKeyPrefix = "tanstack_router_reload:";
const moduleLoadErrorPrefixes = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
] as const;
let preloadRecoveryPending = false;

type PreloadRecoveryEvent = Pick<Event, "preventDefault">;

type RouteResolutionMatch = {
  status: "pending" | "success" | "error" | "redirected" | "notFound";
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

function isAbortLikeError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  if (error instanceof Error || typeof error === "string") {
    const message = errorMessage(error).toLowerCase();
    return (
      message.includes("aborted") || message.includes("canceled") || message.includes("cancelled")
    );
  }
  return false;
}

function moduleLoadRecoveryTags(error: unknown) {
  const message = errorMessage(error);
  if (!moduleLoadErrorPrefixes.some((prefix) => message.startsWith(prefix))) return {};

  let strategy = "tanstack_session";
  let attempted = "unknown";

  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    if (url.searchParams.has(preloadRecoveryParam)) {
      strategy = "vite_url";
      attempted = "true";
    } else {
      try {
        if (window.sessionStorage.getItem(`${tanstackReloadKeyPrefix}${message}`) === "1") {
          attempted = "true";
        }
      } catch {
        strategy = "vite_url";
      }
    }
  }

  return {
    module_load_failure: "true",
    module_recovery_attempted: attempted,
    module_recovery_strategy: strategy,
  };
}

function canUseSessionStorage() {
  try {
    window.sessionStorage.setItem(sessionStorageProbeKey, "1");
    window.sessionStorage.removeItem(sessionStorageProbeKey);
    return true;
  } catch {
    return false;
  }
}

function handleVitePreloadError(event?: PreloadRecoveryEvent) {
  if (canUseSessionStorage() || preloadRecoveryPending) return false;

  const url = new URL(window.location.href);
  if (url.searchParams.has(preloadRecoveryParam)) return false;

  preloadRecoveryPending = true;
  url.searchParams.set(preloadRecoveryParam, String(Date.now()));
  window.location.replace(url);
  event?.preventDefault();
  return true;
}

function isPreloadRecoveryPending() {
  return preloadRecoveryPending;
}

function resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution(
  matches: readonly RouteResolutionMatch[],
) {
  if (matches.length === 0 || matches.some((match) => match.status !== "success")) return false;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(preloadRecoveryParam)) return false;

  preloadRecoveryPending = false;
  url.searchParams.delete(preloadRecoveryParam);
  window.history.replaceState(window.history.state, "", url);
  return true;
}

function setupRuntimeErrorHandlers() {
  window.addEventListener("vite:preloadError", handleVitePreloadError);
}

export {
  handleVitePreloadError,
  isAbortLikeError,
  isPreloadRecoveryPending,
  moduleLoadRecoveryTags,
  resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution,
  setupRuntimeErrorHandlers,
};
