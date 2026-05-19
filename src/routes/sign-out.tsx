import { createFileRoute } from "@tanstack/react-router";

import { signOutRouteOptions } from "@/auth/route-options/sign-out";

export const Route = createFileRoute("/sign-out")(signOutRouteOptions);
