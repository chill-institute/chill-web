import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { Calendar, Film, Flame, Search, Star, Tv } from "lucide-react";
import { match } from "ts-pattern";

const MovieDetailModal = lazy(() =>
  import("@/components/movie-detail-modal").then((m) => ({ default: m.MovieDetailModal })),
);
const TvShowDetailModal = lazy(() =>
  import("@/components/tv-show-detail-modal").then((m) => ({ default: m.TvShowDetailModal })),
);
const SearchOverlay = lazy(() =>
  import("@/components/search-overlay").then((m) => ({ default: m.SearchOverlay })),
);

import { MoviesSourceSelect } from "@/components/movies-source-select";
import { TVShowsSourceSelect } from "@/components/tv-shows-source-select";
import { ShellSettingsMenu } from "@/components/shell-settings-menu";
import { UserErrorAlert } from "@chill-institute/auth/components/user-error-alert";
import { IconButton } from "@chill-institute/ui/components/icon-button";
import { Button } from "@chill-institute/ui/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@chill-institute/ui/components/ui/empty";
import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";
import { StickyHeader } from "@chill-institute/ui/components/sticky-header";
import { Tab, Tabs, tabsContainerClass } from "@chill-institute/ui/components/tabs";
import { PosterCard } from "@chill-institute/ui/components/poster-card";
import { InstituteFooter } from "@chill-institute/ui/components/institute-footer";
import { SortPill, SortRow, SortRowDivider } from "@chill-institute/ui/components/sort-row";
import { readCurrentCallbackPath, useAuth, readStoredToken } from "@chill-institute/auth/auth";
import { publicLinks } from "@chill-institute/ui/lib/public-links";
import {
  moviesSources,
  tvShowsSources,
  type Movie,
  type TVShow,
  type UserSettings,
} from "@/lib/types";
import { moviesQueryOptions, settingsQueryOptions, tvShowsQueryOptions } from "@/queries/options";
import { useMoviesQuery } from "@/queries/movies";
import {
  usePendingMoviesRefresh,
  usePendingTVShowsRefresh,
  useSaveSettings,
  useSettingsQuery,
} from "@/queries/settings";
import { useTVShowsQuery } from "@/queries/tv-shows";

type HomeTab = "movies" | "tv";
type SortKey = "popular" | "rating" | "recent";
type HomeSelection =
  | null
  | { kind: "movie"; movie: Movie }
  | { kind: "show"; imdbId: string; season?: number };

function useCatalogSearchHotkey(isOpen: boolean, open: () => void) {
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (isOpenRef.current) return;
      const isMeta = event.metaKey || event.ctrlKey;
      if (isMeta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
        return;
      }
      if (event.key === "/" && !isMeta && !event.altKey) {
        const target = event.target instanceof HTMLElement ? event.target : null;
        const tag = target?.tagName?.toLowerCase();
        const editable =
          tag === "input" || tag === "textarea" || target?.isContentEditable === true;
        if (editable) return;
        event.preventDefault();
        open();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);
}

type MoviesContentProps = {
  query: ReturnType<typeof useMoviesQuery>;
  pendingRefresh: boolean;
  source: UserSettings["moviesSource"];
  sort: SortKey;
  onSelect: (movie: Movie) => void;
  onPickAnotherSource: () => void;
};

function MoviesContent({
  query,
  pendingRefresh,
  source,
  sort,
  onSelect,
  onPickAnotherSource,
}: MoviesContentProps) {
  if (pendingRefresh) return <PosterGridSkeleton />;
  return match(query)
    .with({ status: "pending" }, () => <PosterGridSkeleton />)
    .with({ status: "error" }, (movies) =>
      movies.isFetching ? (
        <PosterGridSkeleton />
      ) : (
        <UserErrorAlert className="mt-2" error={movies.error} />
      ),
    )
    .with({ status: "success" }, (movies) => {
      if (movies.data.source !== source) return <PosterGridSkeleton />;
      if (movies.data.movies.length === 0) {
        if (movies.isFetching) return <PosterGridSkeleton />;
        return (
          <EmptyState
            message="couldn't fetch any movies from the selected source, please try another one."
            onTryAnother={onPickAnotherSource}
          />
        );
      }
      return (
        <PosterGrid>
          {sortMovies(movies.data.movies, sort).map((movie, index) => (
            <PosterCard
              key={movie.id}
              className="animate-reveal"
              style={staggerDelay(index)}
              title={movie.title}
              image={movie.posterUrl ?? null}
              rating={movie.rating != null ? movie.rating.toFixed(1) : null}
              year={movie.year != null ? String(movie.year) : null}
              onClick={() => onSelect(movie)}
            />
          ))}
        </PosterGrid>
      );
    })
    .exhaustive();
}

type TVShowsContentProps = {
  query: ReturnType<typeof useTVShowsQuery>;
  pendingRefresh: boolean;
  source: UserSettings["tvShowsSource"];
  sort: SortKey;
  onSelect: (show: TVShow) => void;
  onPickAnotherSource: () => void;
};

function TVShowsContent({
  query,
  pendingRefresh,
  source,
  sort,
  onSelect,
  onPickAnotherSource,
}: TVShowsContentProps) {
  if (pendingRefresh) return <PosterGridSkeleton />;
  return match(query)
    .with({ status: "pending" }, () => <PosterGridSkeleton />)
    .with({ status: "error" }, (shows) =>
      shows.isFetching ? (
        <PosterGridSkeleton />
      ) : (
        <UserErrorAlert className="mt-2" error={shows.error} />
      ),
    )
    .with({ status: "success" }, (shows) => {
      if (shows.data.source !== source) return <PosterGridSkeleton />;
      if (shows.data.shows.length === 0) {
        if (shows.isFetching) return <PosterGridSkeleton />;
        return (
          <EmptyState
            message="couldn't fetch any tv shows from the selected source, please try another one."
            onTryAnother={onPickAnotherSource}
          />
        );
      }
      return (
        <PosterGrid>
          {sortShows(shows.data.shows, sort).map((show, index) => (
            <PosterCard
              key={show.imdbId}
              className="animate-reveal"
              style={staggerDelay(index)}
              title={show.title}
              image={show.posterUrl ?? null}
              rating={show.rating != null ? show.rating.toFixed(1) : null}
              year={show.year != null ? String(show.year) : null}
              onClick={() => onSelect(show)}
            />
          ))}
        </PosterGrid>
      );
    })
    .exhaustive();
}

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;

    const settingsPromise = queryClient.ensureQueryData(settingsQueryOptions(token));
    void settingsPromise.then(() => {
      void queryClient.ensureQueryData(moviesQueryOptions(token));
      void queryClient.ensureQueryData(tvShowsQueryOptions(token));
    });
  },
  component: HomePage,
});

function BingeBrand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2">
      <img
        src="/logo.png"
        width={22}
        height={22}
        alt="binge.institute"
        className="border-border-strong rounded border"
      />
      <h3 className="text-fg-1 truncate text-lg leading-7">binge.institute</h3>
    </Link>
  );
}

function HomeShell({
  tab,
  onTabChange,
  onOpenSearch,
  children,
}: {
  tab: HomeTab;
  onTabChange: (next: HomeTab) => void;
  onOpenSearch?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StickyHeader
        brand={<BingeBrand />}
        tabs={
          <Tabs>
            <Tab active={tab === "movies"} onClick={() => onTabChange("movies")}>
              <Film aria-hidden="true" />
              movies
            </Tab>
            <Tab active={tab === "tv"} onClick={() => onTabChange("tv")}>
              <Tv aria-hidden="true" />
              tv shows
            </Tab>
          </Tabs>
        }
        right={
          <>
            {onOpenSearch ? (
              <IconButton
                onClick={onOpenSearch}
                aria-label="search the institute"
                title="search (⌘K)"
              >
                <Search />
              </IconButton>
            ) : null}
            <ShellSettingsMenu />
          </>
        }
      />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-[18px]">
        {children}
        <InstituteFooter
          appName="binge.institute"
          links={[
            { label: "about", href: publicLinks.about },
            { label: "guides", href: publicLinks.guides },
            { label: "github", href: publicLinks.github },
          ]}
        />
      </main>
    </div>
  );
}

function HomePage() {
  const auth = useAuth();
  const callbackURL = readCurrentCallbackPath();

  const configQuery = useSettingsQuery();
  const saveConfigMutation = useSaveSettings();
  const pendingMoviesRefresh = usePendingMoviesRefresh();
  const pendingTVShowsRefresh = usePendingTVShowsRefresh();

  const shouldFetchCatalog = configQuery.status === "success" && !configQuery.isFetching;
  const moviesQuery = useMoviesQuery({ enabled: shouldFetchCatalog });
  const tvShowsQuery = useTVShowsQuery({ enabled: shouldFetchCatalog });

  const [activeTab, setActiveTab] = useState<HomeTab>("movies");
  const [sort, setSort] = useState<SortKey>("popular");
  const [selection, setSelection] = useState<HomeSelection>(null);
  const [searchState, setSearchState] = useState<"unmounted" | "open" | "closed">("unmounted");
  const searchOpen = searchState === "open";

  const openSearch = useCallback(() => setSearchState("open"), []);
  const setSearchOpen = useCallback(
    (open: boolean) => setSearchState(open ? "open" : "closed"),
    [],
  );
  useCatalogSearchHotkey(searchOpen, openSearch);

  function patchConfig(patch: Partial<UserSettings>) {
    if (!configQuery.data) return;
    saveConfigMutation.mutate({ ...configQuery.data, ...patch });
  }

  function handleTabChange(next: HomeTab) {
    setActiveTab(next);
    setSelection(null);
  }

  const selectedMovie = selection?.kind === "movie" ? selection.movie : undefined;
  const selectedShowId = selection?.kind === "show" ? selection.imdbId : undefined;
  const selectedSeason = selection?.kind === "show" ? selection.season : undefined;

  if (!auth.isAuthenticated) {
    return (
      <Navigate
        to="/sign-in"
        search={{ error: undefined, callbackUrl: callbackURL ?? undefined }}
        replace
      />
    );
  }

  return match(configQuery)
    .with({ status: "pending" }, () => (
      <HomeShell tab={activeTab} onTabChange={handleTabChange}>
        <PageHeading tab={activeTab} />
        <SortRowSkeleton />
        <PosterGridSkeleton />
      </HomeShell>
    ))
    .with({ status: "error" }, (query) => (
      <HomeShell tab={activeTab} onTabChange={handleTabChange}>
        <div className="my-6">
          <UserErrorAlert error={query.error} />
        </div>
      </HomeShell>
    ))
    .with({ status: "success" }, (query) => {
      const config = query.data;
      const currentTVShowsResponse =
        tvShowsQuery.status === "success" && tvShowsQuery.data.source === config.tvShowsSource
          ? tvShowsQuery.data
          : undefined;
      const selectedShow = currentTVShowsResponse?.shows.find(
        (show) => show.imdbId === selectedShowId,
      );

      const sourceSelector =
        activeTab === "movies" ? (
          <MoviesSourceSelect
            value={config.moviesSource}
            onChange={(moviesSource) => patchConfig({ moviesSource })}
          />
        ) : (
          <TVShowsSourceSelect
            value={config.tvShowsSource}
            onChange={(tvShowsSource) => patchConfig({ tvShowsSource })}
          />
        );

      const visibleCount =
        activeTab === "movies"
          ? moviesQuery.status === "success" && moviesQuery.data.source === config.moviesSource
            ? moviesQuery.data.movies.length
            : null
          : tvShowsQuery.status === "success" && tvShowsQuery.data.source === config.tvShowsSource
            ? tvShowsQuery.data.shows.length
            : null;
      const noun =
        activeTab === "movies"
          ? visibleCount === 1
            ? "title"
            : "titles"
          : visibleCount === 1
            ? "show"
            : "shows";
      const countLabel = visibleCount != null ? `${visibleCount} ${noun}` : null;

      const activeContent =
        activeTab === "movies" ? (
          <MoviesContent
            query={moviesQuery}
            pendingRefresh={pendingMoviesRefresh}
            source={config.moviesSource}
            sort={sort}
            onSelect={(movie) => setSelection({ kind: "movie", movie })}
            onPickAnotherSource={() => {
              const next = cycleSource(moviesSources, config.moviesSource);
              if (next !== undefined) patchConfig({ moviesSource: next });
            }}
          />
        ) : (
          <TVShowsContent
            query={tvShowsQuery}
            pendingRefresh={pendingTVShowsRefresh}
            source={config.tvShowsSource}
            sort={sort}
            onSelect={(show) => setSelection({ kind: "show", imdbId: show.imdbId, season: 1 })}
            onPickAnotherSource={() => {
              const next = cycleSource(tvShowsSources, config.tvShowsSource);
              if (next !== undefined) patchConfig({ tvShowsSource: next });
            }}
          />
        );

      return (
        <HomeShell tab={activeTab} onTabChange={handleTabChange} onOpenSearch={openSearch}>
          <PageHeading tab={activeTab} />
          <SortRow count={countLabel}>
            <div className={tabsContainerClass}>
              <SortPill active={sort === "popular"} onClick={() => setSort("popular")}>
                <Flame aria-hidden="true" />
                popular
              </SortPill>
              <SortPill active={sort === "rating"} onClick={() => setSort("rating")}>
                <Star aria-hidden="true" />
                rating
              </SortPill>
              <SortPill active={sort === "recent"} onClick={() => setSort("recent")}>
                <Calendar aria-hidden="true" />
                recent
              </SortPill>
            </div>
            <SortRowDivider />
            {sourceSelector}
          </SortRow>

          {activeContent}

          {saveConfigMutation.error ? (
            <UserErrorAlert className="mt-4" error={saveConfigMutation.error} />
          ) : null}

          <Suspense fallback={null}>
            {activeTab === "movies" && selectedMovie ? (
              <MovieDetailModal movie={selectedMovie} onClose={() => setSelection(null)} />
            ) : null}

            {activeTab === "tv" && selectedShowId ? (
              <TvShowDetailModal
                imdbId={selectedShowId}
                fallbackShow={selectedShow}
                activeSeason={selectedSeason}
                onSeasonChange={(season) =>
                  setSelection({ kind: "show", imdbId: selectedShowId, season })
                }
                onClose={() => setSelection(null)}
              />
            ) : null}

            {searchState !== "unmounted" ? (
              <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
            ) : null}
          </Suspense>
        </HomeShell>
      );
    })
    .exhaustive();
}

function PageHeading({ tab }: { tab: HomeTab }) {
  return (
    <div className="flex items-end justify-between gap-4 pt-7 pb-3.5">
      <h2 className="m-0 leading-none">{tab === "movies" ? "movies" : "tv shows"}</h2>
    </div>
  );
}

function PosterGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 pb-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </div>
  );
}

function staggerDelay(index: number): React.CSSProperties {
  const ms = Math.min(index * 25, 350);
  return { animationDelay: `${ms}ms` };
}

const POSTER_SKELETON_SLOTS = Array.from({ length: 18 }, (_, i) => `poster-skel-${i}`);

function PosterGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 pb-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {POSTER_SKELETON_SLOTS.map((slot) => (
        <article
          key={slot}
          className="border-border-strong bg-surface flex flex-col overflow-hidden rounded border"
        >
          <Skeleton className="border-border-strong aspect-[2/3] w-full rounded-none border-b" />
          <div className="flex flex-col gap-2 px-3 py-2.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </article>
      ))}
    </div>
  );
}

function SortRowSkeleton() {
  return (
    <div className="border-border-strong mb-4.5 flex items-center gap-2 border-y py-2">
      <Skeleton className="h-5 w-12" />
      <Skeleton className="h-6 w-16 rounded" />
      <Skeleton className="h-6 w-16 rounded" />
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  );
}

function EmptyState({ message, onTryAnother }: { message: string; onTryAnother?: () => void }) {
  return (
    <Empty className="animate-reveal border-0 py-16">
      <EmptyHeader>
        <EmptyMedia className="mb-1">
          <img
            src="/logo.png"
            width={48}
            height={48}
            alt="binge.institute"
            className="border-border-strong rounded border"
          />
        </EmptyMedia>
        <EmptyTitle className="text-fg-2 font-serif text-xl italic font-normal">
          {message}
        </EmptyTitle>
      </EmptyHeader>
      {onTryAnother ? (
        <EmptyContent>
          <Button onClick={onTryAnother}>try another source</Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

function sortMovies(movies: ReadonlyArray<Movie>, sort: SortKey): readonly Movie[] {
  if (sort === "rating") return movies.toSorted((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sort === "recent") return movies.toSorted((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return movies;
}

function sortShows(shows: ReadonlyArray<TVShow>, sort: SortKey): readonly TVShow[] {
  if (sort === "rating") return shows.toSorted((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sort === "recent") return shows.toSorted((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return shows;
}

function cycleSource(list: ReadonlyArray<number>, current: number): number | undefined {
  const idx = list.indexOf(current);
  return list[idx < 0 ? 0 : (idx + 1) % list.length];
}
