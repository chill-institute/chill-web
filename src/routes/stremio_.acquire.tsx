import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth/auth";
import { SignInRedirect } from "@/auth/components/sign-in-redirect";
import { SearchShell } from "@/components/search-shell";
import { Acquire } from "@/stremio/acquire";
import type { AcquisitionTarget } from "@/stremio/acquisition-api";

export const Route = createFileRoute("/stremio_/acquire")({
  validateSearch: (search: Record<string, unknown>): AcquisitionTarget => {
    if (
      typeof search.installation !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(search.installation) ||
      (search.type !== "movie" && search.type !== "series") ||
      typeof search.target !== "string" ||
      !search.target ||
      search.target.length > 1600
    )
      throw new Error("Invalid Stremio request. Open the title from your add-on again.");
    return { installation: search.installation, type: search.type, target: search.target };
  },
  component: AcquirePage,
});

function AcquirePage() {
  const { authToken } = useAuth();
  const target = Route.useSearch();
  return authToken ? (
    <SearchShell>
      <Acquire
        key={`${authToken}:${target.installation}:${target.type}:${target.target}`}
        token={authToken}
        target={target}
      />
    </SearchShell>
  ) : (
    <SignInRedirect />
  );
}
