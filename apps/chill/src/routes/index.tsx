import { Navigate, createFileRoute } from "@tanstack/react-router";

import { readCurrentCallbackPath, useAuth } from "@chill-institute/auth/auth";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    const callbackURL = readCurrentCallbackPath();
    return (
      <Navigate
        to="/sign-in"
        search={{ error: undefined, callbackUrl: callbackURL ?? undefined }}
        replace
      />
    );
  }

  return null;
}
