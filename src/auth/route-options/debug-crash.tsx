import { Navigate } from "@tanstack/react-router";

function DebugCrashPage() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.location.hostname !== "localhost") {
    return <Navigate to="/" replace />;
  }

  throw new Error("Intentional debug crash for the local error fallback.");
}

export const debugCrashRouteOptions = {
  component: DebugCrashPage,
};
