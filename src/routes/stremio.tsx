import { createFileRoute } from "@tanstack/react-router";
import { SearchShell } from "@/components/search-shell";
import { SignInRedirect } from "@/auth/components/sign-in-redirect";
import { useAuth } from "@/auth/auth";
import { AuthenticatedStremioSetup } from "@/stremio/setup";

export const Route = createFileRoute("/stremio")({ component: StremioPage });

function StremioPage() {
  const auth = useAuth();
  return auth.isAuthenticated ? (
    <SearchShell>
      <AuthenticatedStremioSetup />
    </SearchShell>
  ) : (
    <SignInRedirect />
  );
}
