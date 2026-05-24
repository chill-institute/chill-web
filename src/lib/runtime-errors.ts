const assetSkewReloadKey = "chill.asset-skew-reload.v1";
const assetSkewReloadParam = "__chill_reload";
let assetSkewReloadPendingInMemory = false;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

function errorStack(error: unknown) {
  return error instanceof Error && typeof error.stack === "string" ? error.stack : "";
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

function isServiceWorkerRegistrationError(error: unknown) {
  const message = errorMessage(error);
  const stack = errorStack(error);
  const text = `${message}\n${stack}`.toLowerCase();

  return (
    text.includes("/sw.js") ||
    text.includes("/registersw.js") ||
    text.includes("serviceworker.register") ||
    text.includes("service worker script")
  );
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
  return assetSkewReloadPendingInMemory || Boolean(getSessionStorageItem(assetSkewReloadKey));
}

function resetAssetSkewReloadGuardAfterReload() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(assetSkewReloadParam)) return;

  removeSessionStorageItem(assetSkewReloadKey);
  assetSkewReloadPendingInMemory = false;
  url.searchParams.delete(assetSkewReloadParam);
  window.history.replaceState(window.history.state, "", url);
}

function handleUnhandledRejection(event: {
  preventDefault: () => void;
  reason: unknown;
  stopImmediatePropagation: () => void;
}) {
  if (!isAbortLikeError(event.reason) && !isServiceWorkerRegistrationError(event.reason)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
}

function setupRuntimeErrorHandlers() {
  resetAssetSkewReloadGuardAfterReload();
  window.addEventListener("vite:preloadError", () => handleVitePreloadError());
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
}

function handleVitePreloadError() {
  reloadOnceForAssetSkew();
}

export {
  handleVitePreloadError,
  handleUnhandledRejection,
  isAssetSkewReloadPending,
  isAbortLikeError,
  isServiceWorkerRegistrationError,
  resetAssetSkewReloadGuardAfterReload,
  setupRuntimeErrorHandlers,
};
