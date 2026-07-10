const preloadRecoveryParam = "__chill_reload";
const sessionStorageProbeKey = "chill.preload-recovery-probe.v1";
let preloadRecoveryPending = false;

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

function canUseSessionStorage() {
  try {
    window.sessionStorage.setItem(sessionStorageProbeKey, "1");
    window.sessionStorage.removeItem(sessionStorageProbeKey);
    return true;
  } catch {
    return false;
  }
}

function handleVitePreloadError() {
  if (canUseSessionStorage() || preloadRecoveryPending) return false;

  const url = new URL(window.location.href);
  if (url.searchParams.has(preloadRecoveryParam)) return false;

  preloadRecoveryPending = true;
  url.searchParams.set(preloadRecoveryParam, String(Date.now()));
  window.location.replace(url);
  return true;
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
  resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution,
  setupRuntimeErrorHandlers,
};
