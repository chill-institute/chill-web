import { createFileRoute } from "@tanstack/react-router";

import { debugCrashRouteOptions } from "@chill-institute/auth/routes/debug-crash";

export const Route = createFileRoute("/debug/crash")(debugCrashRouteOptions);
