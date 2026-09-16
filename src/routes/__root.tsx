import { createRootRouteWithContext } from "@tanstack/react-router";

import { navigationUpdate } from "@/lib/pwa-update";
import type { RouterContext } from "@/router";
import { Root } from "@/routes/-root";
import { RootError } from "@/routes/-root-error";
import { RootNotFound } from "@/routes/-root-not-found";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ preload, location }) => navigationUpdate.beforeLoad({ preload, location }),
  component: Root,
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
});
