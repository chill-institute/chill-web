import { createFileRoute, redirect } from "@tanstack/react-router";

import { readStoredToken } from "@chill-institute/auth/auth";

import { readLastTab } from "@/hooks/use-last-tab";
import { settingsQueryOptions } from "@/queries/options";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) {
      throw redirect({ to: "/sign-in", search: { error: undefined, callbackUrl: undefined } });
    }

    void queryClient.ensureQueryData(settingsQueryOptions(token));

    const tab = readLastTab();
    throw redirect({ to: tab === "tv-shows" ? "/tv-shows" : "/movies" });
  },
  component: () => null,
});
