import "./telemetry";

import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

import { getRouter } from "./router";
import { resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution } from "./lib/runtime-errors";
import { addAppBreadcrumb, createSentryReactErrorHandler } from "./lib/sentry";
import { queryClient } from "./query-client";
import "./styles.css";

const pwaUpdateToastId = "pwa-update";
const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast("new version available", {
      action: {
        label: "reload",
        onClick: () => void updateServiceWorker(true),
      },
      cancel: {
        label: "later",
        onClick: () => toast.dismiss(pwaUpdateToastId),
      },
      duration: Number.POSITIVE_INFINITY,
      id: pwaUpdateToastId,
    });
  },
});

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
