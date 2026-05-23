import { createRootRouteWithContext } from "@tanstack/react-router";

import type { RouterContext } from "@/router";
import { Root } from "@/routes/-root";
import { RootError } from "@/routes/-root-error";
import { RootNotFound } from "@/routes/-root-not-found";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
});
