import { createFileRoute } from "@tanstack/react-router";

import { tvShowDetailSearchSchema } from "@/routes/-search-params";
import { TVShowDetailRoute } from "@/routes/-tv-show-detail-route";

export const Route = createFileRoute("/tv-shows/$id")({
  validateSearch: tvShowDetailSearchSchema,
  component: TVShowDetailRoute,
});
