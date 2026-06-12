import { useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { match } from "ts-pattern";

import { SignInRedirect } from "@/auth/components/sign-in-redirect";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { IndexerStatsPanel } from "@/components/indexer-stats-panel";
import { SearchLoading } from "@/components/search-loading";
import { SearchShell } from "@/components/search-shell";
import {
  TorrentResultList,
  TorrentResultToolbar,
  type CodecFilterValue,
  type ResolutionFilterValue,
  type ResultSortValue,
} from "@/components/torrent-results";
import { useAuth } from "@/auth/auth";
import { EmptyState } from "@/ui/components/empty-state";
import { useFastestMode } from "@/hooks/use-fastest-mode";
import { useSearchFilters } from "@/hooks/use-search-filters";
import { formatSearchResults, normalizeQuery } from "@/lib/search";
import {
  applyChillSettingsPatch,
  CodecFilter,
  ResolutionFilter,
  SearchResultDisplayBehavior,
  SortBy,
  SortDirection,
  toChillSettings,
  type ChillSettings,
} from "@/lib/types";
import { combineQueries } from "@/queries/combine";
import { useIndexersQuery } from "@/queries/indexers";
import { useSearchQueries } from "@/queries/search";
import { useSaveSettings, useSettingsQuery } from "@/queries/settings";
import { useSonnerToastDescriptor } from "@/ui/hooks/use-sonner-toast";

const routeApi = getRouteApi("/search");

function toResolutionValue(values: ResolutionFilter[]): ResolutionFilterValue {
  if (values.length !== 1) return "all";
  switch (values[0]) {
    case ResolutionFilter.RESOLUTION_FILTER_720P:
      return "720p";
    case ResolutionFilter.RESOLUTION_FILTER_1080P:
      return "1080p";
    case ResolutionFilter.RESOLUTION_FILTER_2160P:
      return "2160p";
    default:
      return "all";
  }
}

function fromResolutionValue(value: ResolutionFilterValue): ResolutionFilter[] {
  switch (value) {
    case "720p":
      return [ResolutionFilter.RESOLUTION_FILTER_720P];
    case "1080p":
      return [ResolutionFilter.RESOLUTION_FILTER_1080P];
    case "2160p":
      return [ResolutionFilter.RESOLUTION_FILTER_2160P];
    default:
      return [];
  }
}

function toCodecValue(values: CodecFilter[]): CodecFilterValue {
  if (values.length !== 1) return "all";
  switch (values[0]) {
    case CodecFilter.X264:
      return "x264";
    case CodecFilter.X265:
      return "x265";
    default:
      return "all";
  }
}

function fromCodecValue(value: CodecFilterValue): CodecFilter[] {
  switch (value) {
    case "x264":
      return [CodecFilter.X264];
    case "x265":
      return [CodecFilter.X265];
    default:
      return [];
  }
}

function toSortValue(sortBy: SortBy): ResultSortValue {
  switch (sortBy) {
    case SortBy.SIZE:
      return "size";
    case SortBy.UPLOADED_AT:
      return "age";
    default:
      return "seeders";
  }
}

function fromSortValue(value: ResultSortValue): SortBy {
  switch (value) {
    case "size":
      return SortBy.SIZE;
    case "age":
      return SortBy.UPLOADED_AT;
    default:
      return SortBy.SEEDERS;
  }
}

export function SearchPage() {
  const searchParams = routeApi.useSearch();
  const auth = useAuth();
  const submittedQuery = normalizeQuery(searchParams.q ?? "");

  const configQuery = useSettingsQuery();
  const indexersQuery = useIndexersQuery();
  const appSettings = useMemo(
    () => (configQuery.data ? toChillSettings(configQuery.data) : undefined),
    [configQuery.data],
  );
  const {
    filters,
    setCodec,
    setResolution,
    setSort: setLocalSort,
  } = useSearchFilters(appSettings, submittedQuery);
  const saveConfigMutation = useSaveSettings();

  function patchConfig(patch: Partial<ChillSettings>) {
    if (!configQuery.data) return;
    saveConfigMutation.mutate((settings) => applyChillSettingsPatch(settings, patch));
  }

  const enabledIndexers = useMemo(() => {
    const disabled = new Set(appSettings?.disabledIndexerIds ?? []);
    return (indexersQuery.data ?? []).filter(
      (indexer) => indexer.enabled && !disabled.has(indexer.id),
    );
  }, [indexersQuery.data, appSettings?.disabledIndexerIds]);
  const enabledIndexerKey = useMemo(
    () => JSON.stringify(enabledIndexers.map((indexer) => indexer.id).sort()),
    [enabledIndexers],
  );

  const searchState = useSearchQueries(submittedQuery, enabledIndexers);
  const behavior = appSettings?.searchResultDisplayBehavior;
  const isFastestMode = behavior === SearchResultDisplayBehavior.FASTEST;
  const fastestMode = useFastestMode(isFastestMode, submittedQuery, searchState, enabledIndexerKey);
  const displayedResults = isFastestMode ? fastestMode.results : searchState.results;

  const formattedResults = useMemo(
    () =>
      formatSearchResults(
        displayedResults,
        filters.resolution,
        filters.codec,
        filters.other,
        filters.sortBy,
        filters.sortDirection,
      ),
    [
      displayedResults,
      filters.resolution,
      filters.codec,
      filters.other,
      filters.sortBy,
      filters.sortDirection,
    ],
  );

  const fastestToastActionLabel = fastestMode.toast?.action.label ?? null;
  const fastestToastIntentQuery = fastestMode.toast?.action.intent.query ?? null;
  const fastestToastId = fastestMode.toast?.id ?? null;
  const fastestToastKind = fastestMode.toast?.kind ?? null;
  const fastestToastMessage = fastestMode.toast?.message ?? null;
  const dispatchFastestIntent = fastestMode.dispatch;
  const fastestToastDescriptor = useMemo(() => {
    if (
      !fastestToastActionLabel ||
      !fastestToastIntentQuery ||
      !fastestToastId ||
      !fastestToastKind ||
      !fastestToastMessage
    ) {
      return null;
    }
    return {
      action: {
        label: fastestToastActionLabel,
        onClick: () => dispatchFastestIntent({ query: fastestToastIntentQuery, tag: "showAll" }),
      },
      id: fastestToastId,
      kind: fastestToastKind,
      message: fastestToastMessage,
      position: "bottom-center" as const,
    };
  }, [
    dispatchFastestIntent,
    fastestToastActionLabel,
    fastestToastId,
    fastestToastIntentQuery,
    fastestToastKind,
    fastestToastMessage,
  ]);

  useSonnerToastDescriptor(fastestToastDescriptor);

  type RenderPhase = "idle" | "loading" | "results" | "empty" | "filter-empty";

  const renderPhase: RenderPhase = (() => {
    if (submittedQuery.length === 0) return "idle";

    if (isFastestMode) {
      if (fastestMode.state.tag === "loading") return "loading";
      if (fastestMode.state.tag === "preview" || fastestMode.state.tag === "all") {
        if (formattedResults.length === 0 && displayedResults.length > 0) return "filter-empty";
        if (formattedResults.length > 0) return "results";
      }
      if (fastestMode.state.tag === "empty") return "empty";
      return "idle";
    }

    if (searchState.hasPending) return "loading";
    if (formattedResults.length > 0) return "results";
    return "empty";
  })();

  function setSortValue(value: ResultSortValue) {
    const sortBy = fromSortValue(value);
    setLocalSort({ sortBy, sortDirection: SortDirection.DESC });
    patchConfig({ sortBy, sortDirection: SortDirection.DESC });
  }

  if (!auth.isAuthenticated) {
    return <SignInRedirect />;
  }

  const combined = combineQueries(configQuery, indexersQuery);

  const remember = appSettings?.rememberQuickFilters ?? false;
  const filtersNode =
    submittedQuery.length > 0 && appSettings ? (
      <TorrentResultToolbar
        resolution={toResolutionValue(filters.resolution)}
        codec={toCodecValue(filters.codec)}
        sort={toSortValue(filters.sortBy)}
        hasActiveFilters={filters.resolution.length > 0 || filters.codec.length > 0}
        onResolutionChange={(value) => {
          const next = fromResolutionValue(value);
          setResolution(next);
          if (remember) patchConfig({ resolutionFilters: next });
        }}
        onCodecChange={(value) => {
          const next = fromCodecValue(value);
          setCodec(next);
          if (remember) patchConfig({ codecFilters: next });
        }}
        onSortChange={setSortValue}
        onClearFilters={() => {
          setResolution([]);
          setCodec([]);
          if (remember) patchConfig({ resolutionFilters: [], codecFilters: [] });
        }}
      />
    ) : null;

  const content = match(combined)
    .with({ status: "pending" }, () => (submittedQuery.length > 0 ? <SearchLoading /> : null))
    .with({ status: "error" }, (q) => (
      <div className="mx-auto mt-6 w-full max-w-2xl">
        <UserErrorAlert error={q.error} />
      </div>
    ))
    .with({ status: "success" }, ({ data: [config] }) => {
      const effective = toChillSettings(config);
      const renderContent = match(renderPhase)
        .with("idle", () => null)
        .with("loading", () => <SearchLoading />)
        .with("empty", () => (
          <EmptyState
            icon="🤠"
            title="Well, we found absolutely nothing."
            description={
              <div>
                Maybe try searching for something else?
                <br />
                Like…{" "}
                <Link
                  className="decoration-fg-4 hover-hover:hover:text-fg-1 hover-hover:hover:decoration-fg-1 inline-block underline decoration-1 underline-offset-3 transition-[color,transform,text-decoration-color] duration-fast hover:-translate-y-px"
                  to="/search"
                  search={{ q: "Synthetic Feature Alpha" }}
                >
                  Synthetic Feature Alpha?
                </Link>
              </div>
            }
          />
        ))
        .with("filter-empty", () => (
          <EmptyState
            icon="🤨"
            title="Those filters… they do nothing!"
            description="Try changing your filters."
          />
        ))
        .with("results", () => <TorrentResultList results={formattedResults} />)
        .exhaustive();

      return (
        <section data-page="search" className="flex flex-col gap-3 lg:gap-6">
          <h1 className="sr-only">Search results</h1>
          {renderContent}

          {searchState.indexerStats.length > 0 ? (
            <details className="mx-auto w-full max-w-7xl">
              <summary className="hover-hover:hover:text-fg-2 w-fit cursor-pointer text-xs text-fg-3 select-none">
                indexer stats
              </summary>
              <IndexerStatsPanel
                indexers={(indexersQuery.data ?? []).map((indexer) => ({
                  id: indexer.id,
                  name: indexer.name,
                }))}
                stats={searchState.indexerStats}
                disabledIndexerIds={effective.disabledIndexerIds}
                onToggle={(id) => {
                  const current = effective.disabledIndexerIds;
                  const next = current.includes(id)
                    ? current.filter((item) => item !== id)
                    : [...current, id];
                  patchConfig({ disabledIndexerIds: next });
                }}
              />
            </details>
          ) : null}

          {searchState.firstError ? (
            <UserErrorAlert
              className="mx-auto mt-4 w-full max-w-2xl"
              error={searchState.firstError}
            />
          ) : null}
          {saveConfigMutation.error ? (
            <UserErrorAlert
              className="mx-auto mt-4 w-full max-w-2xl"
              error={saveConfigMutation.error}
            />
          ) : null}
        </section>
      );
    })
    .exhaustive();

  return (
    <SearchShell contentWidth="wide" filters={filtersNode}>
      {content}
    </SearchShell>
  );
}
