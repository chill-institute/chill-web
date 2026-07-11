import "./telemetry";

import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";

import { getRouter } from "./router";
import { resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution } from "./lib/runtime-errors";
import { addAppBreadcrumb, createSentryReactErrorHandler } from "./lib/sentry";
import { queryClient } from "./query-client";
import { showPwaUpdateToast } from "./ui/lib/pwa-update-toast";
import "./styles.css";

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    showPwaUpdateToast(updateServiceWorker);
  },
});

if (import.meta.env.VITE_PUBLIC_RELEASE === "visual-test") {
  window.addEventListener("chill:visual-pwa-update", () => {
    showPwaUpdateToast(() => Promise.resolve());
  });
}

const router = getRouter();
router.subscribe("onResolved", (event) => {
  resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution(router.state.matches);
  if (!event.pathChanged) return;
  addAppBreadcrumb("route", { path: event.toLocation.pathname });
});

const Devtools = import.meta.env.DEV
  ? lazy(async () => {
      const mod = await import("@tanstack/react-query-devtools");
      return { default: mod.ReactQueryDevtools };
    })
  : null;

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing #app container");
}

createRoot(container, {
  onCaughtError: createSentryReactErrorHandler(),
  onRecoverableError: createSentryReactErrorHandler(),
  onUncaughtError: createSentryReactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
      {Devtools ? (
        <Suspense fallback={null}>
          <Devtools buttonPosition="bottom-left" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  </StrictMode>,
);
