import { createFileRoute } from "@tanstack/react-router";

import { debugCrashRouteOptions } from "@/auth/route-options/debug-crash";

export const Route = createFileRoute("/debug/crash")(debugCrashRouteOptions);
