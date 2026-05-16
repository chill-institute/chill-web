import { createFileRoute } from "@tanstack/react-router";

import { authSuccessRouteOptions } from "@chill-institute/auth/routes/auth-success";

export const Route = createFileRoute("/auth/success")(authSuccessRouteOptions);
