import { createFileRoute } from "@tanstack/react-router";

import { SignInRedirect } from "@/auth/components/sign-in-redirect";
import { useAuth } from "@/auth/auth";

import { HomeShell } from "@/components/home-shell";
import { homeSearchSchema } from "@/routes/-search-params";

export const Route = createFileRoute("/")({
  validateSearch: homeSearchSchema,
  component: HomePage,
});

function HomePage() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <SignInRedirect />;
  }

  return <HomeShell />;
}
