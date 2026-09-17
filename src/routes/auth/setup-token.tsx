import { createFileRoute } from "@tanstack/react-router";

import { setupTokenRouteOptions } from "@/auth/route-options/setup-token";

export const Route = createFileRoute("/auth/setup-token")(setupTokenRouteOptions);
