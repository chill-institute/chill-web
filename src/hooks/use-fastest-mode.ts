import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type FastestPhase = "idle" | "fastest" | "all" | "empty";

type SearchInfo = {
  results: { length: number };
  totalCount: number;
  nonEmptyResolvedCount: number;
  pendingCount: number;
  hasPending: boolean;
};

function computeNextPhase(
  current: FastestPhase,
  search: SearchInfo,
  resultsCount: number,
): FastestPhase {
  const allDone = search.totalCount > 0 && !search.hasPending;
  const threshold = Math.min(Math.ceil(search.totalCount / 2), 3);

  if (current === "idle") {
    if (allDone && resultsCount === 0) return "empty";
    if (search.nonEmptyResolvedCount >= threshold && resultsCount > 0) return "fastest";
    if (allDone && resultsCount > 0) return "all";
    return "idle";
  }

  if (current === "fastest" && allDone) {
    return "all";
  }

  return current;
}

export function useFastestMode(
  isFastestMode: boolean,
  submittedQuery: string,
  searchState: SearchInfo,
) {
  const [phase, setPhase] = useState<FastestPhase>("idle");
  const [lastQuery, setLastQuery] = useState(submittedQuery);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const lastToastPendingRef = useRef<number | undefined>(undefined);

  if (submittedQuery !== lastQuery) {
    setLastQuery(submittedQuery);
    setPhase("idle");
  }

  const resultsCount = searchState.results.length;
  const nextPhase =
    isFastestMode && submittedQuery.length > 0
      ? computeNextPhase(phase, searchState, resultsCount)
      : phase;
  if (nextPhase !== phase) {
    setPhase(nextPhase);
  }

  useEffect(() => {
    if (nextPhase !== "fastest") {
      if (toastIdRef.current !== undefined) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
        lastToastPendingRef.current = undefined;
      }
      return;
    }

    if (lastToastPendingRef.current === searchState.pendingCount && toastIdRef.current) {
      return;
    }
    lastToastPendingRef.current = searchState.pendingCount;
    toastIdRef.current = toast.loading(
      `Fetching more from ${searchState.pendingCount} indexer${
        searchState.pendingCount > 1 ? "s" : ""
      }`,
      {
        id: toastIdRef.current,
        duration: Number.POSITIVE_INFINITY,
        position: "bottom-center",
        action: {
          label: "Update",
          onClick: () => {
            setPhase("all");
            if (toastIdRef.current !== undefined) {
              toast.dismiss(toastIdRef.current);
              toastIdRef.current = undefined;
              lastToastPendingRef.current = undefined;
            }
          },
        },
      },
    );
  }, [nextPhase, searchState.pendingCount]);

  useEffect(() => {
    return () => {
      if (toastIdRef.current !== undefined) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  return phase;
}
