import { createFileRoute } from "@tanstack/react-router";

import { SignInRedirect } from "@chill-institute/auth/components/sign-in-redirect";
import { useAuth } from "@chill-institute/auth/auth";

import { HomeShell } from "@/components/home-shell";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <SignInRedirect />;
  }

  return <HomeShell />;
}
