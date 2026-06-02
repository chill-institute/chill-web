import { useCallback, useRef, useState } from "react";

type FastestState<T> =
  | { query: string; tag: "all" }
  | { query: string; tag: "empty" }
  | { tag: "idle" }
  | { query: string; tag: "loading" }
  | {
      availableCount: number;
      pendingCount: number;
      query: string;
      results: readonly T[];
      tag: "preview";
    };

type FastestIntent = { tag: "auto" } | { generation: number; query: string; tag: "showAll" };
type FastestToastIntent = { query: string; tag: "showAll" };

type FastestToastAction = { intent: FastestToastIntent; label: string };

type FastestToast = {
  action: FastestToastAction;
  id: string;
  kind: "default" | "loading";
  message: string;
};

type SearchInfo<T> = {
  results: readonly T[];
  totalCount: number;
  nonEmptyResolvedCount: number;
  pendingCount: number;
  hasPending: boolean;
};

type FastestSnapshot<T> = {
  query: string;
  results: readonly T[];
  sourceKey: string;
};

type FastestStateInput<T> = {
  enabled: boolean;
  generation: number;
  intent: FastestIntent;
  query: string;
  search: SearchInfo<T>;
  sourceKey: string;
  snapshot: FastestSnapshot<T> | null;
};

type FastestModel<T> = {
  snapshot: FastestSnapshot<T> | null;
  state: FastestState<T>;
};

function hasPreviewQuorum<T>(search: SearchInfo<T>): boolean {
  const threshold = Math.min(Math.ceil(search.totalCount / 2), 3);
  return search.nonEmptyResolvedCount >= threshold && search.results.length > 0;
}

export function deriveFastestModel<T>({
  enabled,
  generation,
  intent,
  query,
  search,
  sourceKey,
  snapshot,
}: FastestStateInput<T>): FastestModel<T> {
  if (!enabled || query.length === 0) {
    return { snapshot: null, state: { tag: "idle" } };
  }

  if (intent.tag === "showAll" && intent.query === query && intent.generation === generation) {
    return { snapshot: null, state: { query, tag: "all" } };
  }

  if (snapshot?.query === query && snapshot.sourceKey === sourceKey) {
    return {
      snapshot,
      state: {
        availableCount: search.results.length,
        pendingCount: search.pendingCount,
        query,
        results: snapshot.results,
        tag: "preview",
      },
    };
  }

  const allDone = search.totalCount > 0 && !search.hasPending;
  if (allDone && search.results.length === 0) {
    return { snapshot: null, state: { query, tag: "empty" } };
  }
  if (allDone && search.results.length > 0) {
    return { snapshot: null, state: { query, tag: "all" } };
  }

  if (!hasPreviewQuorum(search)) {
    return {
      snapshot: null,
      state: search.hasPending ? { query, tag: "loading" } : { tag: "idle" },
    };
  }

  const preview = {
    query,
    results: search.results,
    sourceKey,
  };

  return {
    snapshot: preview,
    state: {
      availableCount: search.results.length,
      pendingCount: search.pendingCount,
      query,
      results: preview.results,
      tag: "preview",
    },
  };
}

export function getFastestToast<T>(state: FastestState<T>): FastestToast | null {
  if (state.tag !== "preview") return null;

  const hiddenCount = state.availableCount - state.results.length;
  if (hiddenCount <= 0) return null;

  if (state.pendingCount === 0) {
    return {
      action: {
        intent: { query: state.query, tag: "showAll" },
        label: "Update",
      },
      id: "fastest-mode-search",
      kind: "default",
      message: `Found ${hiddenCount} more ${hiddenCount === 1 ? "result" : "results"}`,
    };
  }

  return {
    action: {
      intent: { query: state.query, tag: "showAll" },
      label: "Update",
    },
    id: "fastest-mode-search",
    kind: "loading",
    message: `Fetching more from ${state.pendingCount} indexer${
      state.pendingCount === 1 ? "" : "s"
    }`,
  };
}

function getFastestResults<T>(state: FastestState<T>, currentResults: readonly T[]) {
  return state.tag === "preview" ? state.results : currentResults;
}

export function useFastestMode<T>(
  enabled: boolean,
  query: string,
  search: SearchInfo<T>,
  sourceKey: string,
) {
  const [intent, setIntent] = useState<FastestIntent>({ tag: "auto" });
  const snapshotRef = useRef<FastestSnapshot<T> | null>(null);
  const generationRef = useRef({ generation: 0, query, sourceKey });
  if (generationRef.current.query !== query || generationRef.current.sourceKey !== sourceKey) {
    generationRef.current = {
      generation: generationRef.current.generation + 1,
      query,
      sourceKey,
    };
  }
  const generation = generationRef.current.generation;
  const model = deriveFastestModel({
    enabled,
    generation,
    intent,
    query,
    search,
    sourceKey,
    snapshot: snapshotRef.current,
  });
  snapshotRef.current = model.snapshot;

  const dispatch = useCallback((nextIntent: FastestToastIntent) => {
    setIntent({ ...nextIntent, generation: generationRef.current.generation });
  }, []);

  return {
    dispatch,
    results: getFastestResults(model.state, search.results),
    state: model.state,
    toast: getFastestToast(model.state),
  };
}
