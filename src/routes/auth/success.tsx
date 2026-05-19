import { createFileRoute } from "@tanstack/react-router";

import { authSuccessRouteOptions } from "@/auth/route-options/auth-success";

export const Route = createFileRoute("/auth/success")(authSuccessRouteOptions);
