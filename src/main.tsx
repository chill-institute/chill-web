import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { router } from "./router";
import { queryClient } from "./query-client";
import "./styles.css";

const storedTheme = window.localStorage.getItem("chill.theme");
if (storedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (storedTheme !== "light") {
  // "system" or unset — check system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
}

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing #app container");
}

createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  </React.StrictMode>,
);
