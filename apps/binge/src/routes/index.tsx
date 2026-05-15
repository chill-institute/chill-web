import { createFileRoute, redirect } from "@tanstack/react-router";

import { readStoredToken } from "@chill-institute/auth/auth";

import { readLastTab } from "@/hooks/use-last-tab";
import { moviesQueryOptions, settingsQueryOptions, tvShowsQueryOptions } from "@/queries/options";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) {
      throw redirect({ to: "/sign-in", search: { error: undefined, callbackUrl: undefined } });
    }

    const settingsPromise = queryClient.ensureQueryData(settingsQueryOptions(token));
    void settingsPromise.then(() => {
      void queryClient.ensureQueryData(moviesQueryOptions(token));
      void queryClient.ensureQueryData(tvShowsQueryOptions(token));
    });

    const tab = readLastTab();
    throw redirect({ to: tab === "tv-shows" ? "/tv-shows" : "/movies" });
  },
  component: () => null,
});
