import { useRef } from "react";
import { useQueries } from "@tanstack/react-query";

import { useApi } from "@chill-institute/auth/api-context";
import { isIgnorableAbortError } from "@chill-institute/auth/errors";
import type { SearchResult, UserIndexer } from "@/lib/types";

type SearchData = { results?: SearchResult[] } | undefined;

function dedupeResults(datas: readonly SearchData[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const data of datas) {
    for (const r of data?.results ?? []) {
      const key = `${r.id}:${r.link}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
  }
  return out;
}

export function useSearchQueries(query: string, enabledIndexers: UserIndexer[]) {
  const api = useApi();
  const cacheRef = useRef<{ datas: readonly SearchData[]; results: SearchResult[] } | null>(null);

  return useQueries({
    queries: enabledIndexers.map((indexer) => ({
      queryKey: ["search", query, indexer.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => api.search(query, indexer.id, signal),
      enabled: query.length > 0,
    })),
    combine: (queries) => {
      const pendingCount = queries.filter((q) => q.isLoading).length;
      const nonEmptyResolvedCount = queries.filter(
        (q) => !q.isLoading && (q.data?.results?.length ?? 0) > 0,
      ).length;
      const firstError =
        queries.find((q) => q.error && !isIgnorableAbortError(q.error))?.error ?? null;

      const datas = queries.map((q) => q.data);
      const cached = cacheRef.current;
      const cacheHit =
        cached !== null &&
        cached.datas.length === datas.length &&
        cached.datas.every((d, i) => d === datas[i]);

      const results = cacheHit ? cached.results : dedupeResults(datas);
      if (!cacheHit) {
        cacheRef.current = { datas, results };
      }

      return {
        results,
        pendingCount,
        nonEmptyResolvedCount,
        totalCount: queries.length,
        hasPending: pendingCount > 0,
        firstError,
      };
    },
  });
}
