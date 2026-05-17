import { createFileRoute } from "@tanstack/react-router";

import { cliTokenRouteOptions } from "@chill-institute/auth/routes/cli-token";

export const Route = createFileRoute("/auth/cli-token")(cliTokenRouteOptions);
