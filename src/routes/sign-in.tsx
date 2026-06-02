import { createFileRoute } from "@tanstack/react-router";

import { signInRouteOptions } from "@/auth/route-options/sign-in";

export const Route = createFileRoute("/sign-in")(signInRouteOptions);
