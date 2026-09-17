import { createFileRoute } from "@tanstack/react-router";

import { chillyTokenRouteOptions } from "@/auth/route-options/chilly-token";

export const Route = createFileRoute("/auth/chilly-token")(chillyTokenRouteOptions);
