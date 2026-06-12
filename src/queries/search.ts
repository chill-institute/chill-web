import { useQueries } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";
import { isIgnorableAbortError } from "@/auth/errors";
import type { IndexerStat, SearchResult, UserIndexer } from "@/lib/types";

export function useSearchQueries(query: string, enabledIndexers: UserIndexer[]) {
  const api = useApi();
  const auth = useAuth();

  return useQueries({
    queries: enabledIndexers.map((indexer) => ({
      queryKey: ["search", query, indexer.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => api.search(query, indexer.id, signal),
      enabled: auth.isAuthenticated && query.length > 0,
    })),
    combine: (queries) => {
      const pendingCount = queries.filter((q) => q.isLoading).length;
      const nonEmptyResolvedCount = queries.filter(
        (q) => !q.isLoading && (q.data?.results?.length ?? 0) > 0,
      ).length;
      const firstError =
        queries.find((q) => q.error && !isIgnorableAbortError(q.error))?.error ?? null;

      const seen = new Set<string>();
      const results: SearchResult[] = [];
      for (const q of queries) {
        for (const r of q.data?.results ?? []) {
          const key = `${r.id}:${r.link}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(r);
          }
        }
      }

      const statsByID = new Map<string, IndexerStat>();
      for (const q of queries) {
        for (const stat of q.data?.indexerStats ?? []) {
          const key = stat.id || stat.name;
          if (!key) continue;
          const prior = statsByID.get(key);
          if (!prior || stat.elapsedMs > prior.elapsedMs) {
            statsByID.set(key, stat);
          }
        }
      }
      const indexerStats = [...statsByID.values()].sort((a, b) => b.elapsedMs - a.elapsedMs);

      return {
        results,
        indexerStats,
        pendingCount,
        nonEmptyResolvedCount,
        totalCount: queries.length,
        hasPending: pendingCount > 0,
        firstError,
      };
    },
  });
}
