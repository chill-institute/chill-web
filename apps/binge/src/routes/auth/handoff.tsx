import { createFileRoute } from "@tanstack/react-router";

import { handoffRouteOptions } from "@chill-institute/auth/routes/handoff";

export const Route = createFileRoute("/auth/handoff")(handoffRouteOptions);
