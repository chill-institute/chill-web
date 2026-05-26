import "./telemetry";

import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";

import { getRouter } from "./router";
import { createSentryReactErrorHandler } from "./lib/sentry";
import { queryClient } from "./query-client";
import "./styles.css";

registerSW({ immediate: true });

const router = getRouter();

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
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
      {Devtools ? (
        <Suspense fallback={null}>
          <Devtools buttonPosition="bottom-left" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  </React.StrictMode>,
);
