import { useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { match } from "ts-pattern";

import { SignInRedirect } from "@/auth/components/sign-in-redirect";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { FilterBarLoading, SearchLoading } from "@/components/search-loading";
import { SearchResults } from "@/components/search-results";
import { SearchShell } from "@/components/search-shell";
import { useAuth } from "@/auth/auth";
import { EmptyState } from "@/ui/components/empty-state";
import { useFastestMode } from "@/hooks/use-fastest-mode";
import { useSearchFilters } from "@/hooks/use-search-filters";
import { defaultSortDirection, formatSearchResults, normalizeQuery } from "@/lib/search";
import {
  applyChillSettingsPatch,
  SearchResultDisplayBehavior,
  SortDirection,
  toChillSettings,
  type ChillSettings,
} from "@/lib/types";
import { combineQueries } from "@/queries/combine";
import { useIndexersQuery } from "@/queries/indexers";
import { useSearchQueries } from "@/queries/search";
import { useSaveSettings, useSettingsQuery } from "@/queries/settings";

const routeApi = getRouteApi("/search");

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
    setOther,
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

  const searchState = useSearchQueries(submittedQuery, enabledIndexers);

  const formattedResults = useMemo(
    () =>
      formatSearchResults(
        searchState.results,
        filters.resolution,
        filters.codec,
        filters.other,
        filters.sortBy,
        filters.sortDirection,
      ),
    [
      searchState.results,
      filters.resolution,
      filters.codec,
      filters.other,
      filters.sortBy,
      filters.sortDirection,
    ],
  );

  const behavior = appSettings?.searchResultDisplayBehavior;
  const isFastestMode = behavior === SearchResultDisplayBehavior.FASTEST;
  const fastestPhase = useFastestMode(isFastestMode, submittedQuery, searchState);

  type RenderPhase = "idle" | "loading" | "results" | "empty" | "filter-empty";

  const renderPhase: RenderPhase = (() => {
    if (submittedQuery.length === 0) return "idle";

    if (isFastestMode) {
      if (fastestPhase === "idle" && searchState.hasPending) return "loading";
      if (fastestPhase === "fastest" || fastestPhase === "all") {
        if (formattedResults.length === 0 && searchState.results.length > 0) return "filter-empty";
        if (formattedResults.length > 0) return "results";
      }
      if (fastestPhase === "empty") return "empty";
      return "idle";
    }

    if (searchState.hasPending) return "loading";
    if (formattedResults.length > 0) return "results";
    return "empty";
  })();

  function setSort(nextSortBy: ChillSettings["sortBy"]) {
    if (filters.sortBy === nextSortBy) {
      const nextDirection =
        filters.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
      setLocalSort({ sortBy: nextSortBy, sortDirection: nextDirection });
      patchConfig({ sortDirection: nextDirection });
      return;
    }
    const nextDirection = defaultSortDirection(nextSortBy);
    setLocalSort({ sortBy: nextSortBy, sortDirection: nextDirection });
    patchConfig({ sortBy: nextSortBy, sortDirection: nextDirection });
  }

  if (!auth.isAuthenticated) {
    return <SignInRedirect />;
  }

  const combined = combineQueries(configQuery, indexersQuery);

  const content = match(combined)
    .with({ status: "pending" }, () =>
      submittedQuery.length > 0 ? (
        <>
          <FilterBarLoading />
          <SearchLoading />
        </>
      ) : null,
    )
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
        .with("results", () => (
          <SearchResults
            results={formattedResults}
            sortBy={filters.sortBy}
            sortDirection={filters.sortDirection}
            titleBehavior={effective.searchResultTitleBehavior}
            onSort={setSort}
          />
        ))
        .exhaustive();

      return (
        <section data-page="search" className="flex flex-col gap-3 lg:gap-6">
          <h1 className="sr-only">Search results</h1>
          {submittedQuery.length > 0 ? (
            <SearchFilterBar
              filters={filters}
              onResolutionChange={(next) => {
                setResolution(next);
                if (effective.rememberQuickFilters) patchConfig({ resolutionFilters: next });
              }}
              onCodecChange={(next) => {
                setCodec(next);
                if (effective.rememberQuickFilters) patchConfig({ codecFilters: next });
              }}
              onOtherChange={(next) => {
                setOther(next);
                if (effective.rememberQuickFilters) patchConfig({ otherFilters: next });
              }}
              onSort={setSort}
            />
          ) : null}

          {renderContent}

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

  return <SearchShell contentWidth="wide">{content}</SearchShell>;
}
