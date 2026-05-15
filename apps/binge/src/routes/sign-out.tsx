import { createFileRoute } from "@tanstack/react-router";

import { signOutRouteOptions } from "@chill-institute/auth/routes/sign-out";

export const Route = createFileRoute("/sign-out")(signOutRouteOptions);
