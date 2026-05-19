import { createFileRoute } from "@tanstack/react-router";

import { cliTokenRouteOptions } from "@/auth/route-options/cli-token";

export const Route = createFileRoute("/auth/cli-token")(cliTokenRouteOptions);
