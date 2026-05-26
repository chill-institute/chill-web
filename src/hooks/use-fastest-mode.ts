import { useEffect, useState } from "react";
import { toast } from "sonner";

type FastestPhase = "idle" | "fastest" | "all" | "empty";

type SearchInfo = {
  results: { length: number };
  totalCount: number;
  nonEmptyResolvedCount: number;
  pendingCount: number;
  hasPending: boolean;
};

export function computeFastestPhase(search: SearchInfo): FastestPhase {
  const allDone = search.totalCount > 0 && !search.hasPending;
  const threshold = Math.min(Math.ceil(search.totalCount / 2), 3);
  const resultsCount = search.results.length;

  if (allDone && resultsCount === 0) return "empty";
  if (allDone && resultsCount > 0) return "all";
  if (search.nonEmptyResolvedCount >= threshold && resultsCount > 0) return "fastest";
  return "idle";
}

export function useFastestMode(
  isFastestMode: boolean,
  submittedQuery: string,
  searchState: SearchInfo,
) {
  const [showAllQuery, setShowAllQuery] = useState<string | null>(null);
  const automaticPhase =
    isFastestMode && submittedQuery.length > 0 ? computeFastestPhase(searchState) : "idle";
  const phase =
    showAllQuery === submittedQuery && automaticPhase === "fastest" ? "all" : automaticPhase;

  useEffect(() => {
    if (phase !== "fastest") {
      return;
    }

    const toastId = toast.loading(
      `Fetching more from ${searchState.pendingCount} indexer${
        searchState.pendingCount > 1 ? "s" : ""
      }`,
      {
        duration: Number.POSITIVE_INFINITY,
        position: "bottom-center",
        action: {
          label: "Update",
          onClick: () => setShowAllQuery(submittedQuery),
        },
      },
    );

    return () => {
      toast.dismiss(toastId);
    };
  }, [phase, searchState.pendingCount, submittedQuery]);

  return phase;
}
