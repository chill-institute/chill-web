const assetSkewReloadKey = "chill.asset-skew-reload.v1";
const assetSkewReloadParam = "__chill_reload";
let assetSkewReloadPendingInMemory = false;

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

function getSessionStorageItem(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeSessionStorageItem(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in private or locked-down browser contexts.
  }
}

function setSessionStorageItem(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // The URL reload marker still prevents a same-load retry loop.
  }
}

function reloadOnceForAssetSkew() {
  const url = new URL(window.location.href);
  if (url.searchParams.has(assetSkewReloadParam)) return false;
  if (getSessionStorageItem(assetSkewReloadKey)) return false;

  setSessionStorageItem(assetSkewReloadKey, "1");
  assetSkewReloadPendingInMemory = true;
  url.searchParams.set(assetSkewReloadParam, String(Date.now()));
  window.location.replace(url);
  return true;
}

function isAssetSkewReloadPending() {
  return assetSkewReloadPendingInMemory;
}

function resetAssetSkewReloadGuardAfterSuccessfulRouteResolution(
  matches: readonly RouteResolutionMatch[],
) {
  if (matches.length === 0 || matches.some((match) => match.status !== "success")) return false;

  const url = new URL(window.location.href);
  removeSessionStorageItem(assetSkewReloadKey);
  assetSkewReloadPendingInMemory = false;

  if (!url.searchParams.has(assetSkewReloadParam)) return true;

  url.searchParams.delete(assetSkewReloadParam);
  window.history.replaceState(window.history.state, "", url);
  return true;
}

function setupRuntimeErrorHandlers() {
  window.addEventListener("vite:preloadError", handleVitePreloadError);
}

function handleVitePreloadError() {
  reloadOnceForAssetSkew();
}

export {
  handleVitePreloadError,
  isAssetSkewReloadPending,
  isAbortLikeError,
  resetAssetSkewReloadGuardAfterSuccessfulRouteResolution,
  setupRuntimeErrorHandlers,
};
