import type { QueryClient } from "@tanstack/react-query";
import { createRoute, createRouter, lazyRouteComponent } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Route as rootRoute } from "./routes/__root";

export interface RouterContext {
  queryClient: QueryClient;
}

if (import.meta.env.DEV) {
  const children = Object.values(routeTree.children ?? {});

  if (!children.some((route) => route.fullPath === "/dev")) {
    routeTree.addChildren([
      ...children,
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/dev",
        component: lazyRouteComponent(() => import("@chill-institute/auth/routes/dev"), "DevRoute"),
      }),
    ]);
  }
}

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: "intent",
  context: undefined! as RouterContext,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
