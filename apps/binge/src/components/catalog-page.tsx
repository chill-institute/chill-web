import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Calendar, Film, Flame, Search, Star, Tv } from "lucide-react";
import { match } from "ts-pattern";

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
import { tabsContainerClass } from "@chill-institute/ui/components/tabs";
import { Tabs, TabsList, TabsTrigger } from "@chill-institute/ui/components/ui/tabs";
import { PosterCard } from "@chill-institute/ui/components/poster-card";
import { InstituteFooter } from "@chill-institute/ui/components/institute-footer";
import { SortPill, SortRow, SortRowDivider } from "@chill-institute/ui/components/sort-row";
import { readCurrentCallbackPath, useAuth } from "@chill-institute/auth/auth";
import { publicLinks } from "@chill-institute/ui/lib/public-links";

import { writeLastTab } from "@/hooks/use-last-tab";
import { useMoviesQuery } from "@/queries/movies";
import { useSaveSettings, useSettingsQuery } from "@/queries/settings";
import { useTVShowsQuery } from "@/queries/tv-shows";
import {
  moviesSources,
  parseMoviesSource,
  parseTVShowsSource,
  tvShowsSources,
  type Movie,
  type TVShow,
  type UserSettings,
} from "@/lib/types";

const SearchOverlay = lazy(() =>
  import("@/components/search-overlay").then((m) => ({ default: m.SearchOverlay })),
);

type CatalogTab = "movies" | "tv-shows";
export type SortKey = "popular" | "rating" | "recent";

export function parseSortKey(value: unknown): SortKey | undefined {
  return value === "popular" || value === "rating" || value === "recent" ? value : undefined;
}

const SORT_DEFAULT: SortKey = "popular";

function useCatalogSearchHotkey(isOpen: boolean, open: () => void) {
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (isOpen) return;
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
  }, [isOpen, open]);
}

type CatalogPageProps = {
  tab: CatalogTab;
  sort: SortKey;
  source?: number;
};

export function CatalogPage({ tab, sort, source }: CatalogPageProps) {
  const auth = useAuth();
  const callbackURL = readCurrentCallbackPath();
  const navigate = useNavigate();

  const configQuery = useSettingsQuery();
  const saveConfigMutation = useSaveSettings();

  const shouldFetchCatalog = configQuery.status === "success" && !configQuery.isFetching;
  const moviesQuery = useMoviesQuery({ enabled: shouldFetchCatalog });
  const tvShowsQuery = useTVShowsQuery({ enabled: shouldFetchCatalog });

  const [searchState, setSearchState] = useState<"unmounted" | "open" | "closed">("unmounted");
  const searchOpen = searchState === "open";
  const openSearch = useCallback(() => setSearchState("open"), []);
  const setSearchOpen = useCallback(
    (open: boolean) => setSearchState(open ? "open" : "closed"),
    [],
  );
  useCatalogSearchHotkey(searchOpen, openSearch);

  useEffect(() => {
    writeLastTab(tab);
  }, [tab]);

  function patchConfig(patch: Partial<UserSettings>) {
    if (!configQuery.data) return;
    saveConfigMutation.mutate({ ...configQuery.data, ...patch });
  }

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
      <HomeShell tab={tab}>
        <PageHeading tab={tab} />
        <SortRowSkeleton />
        <PosterGridSkeleton />
      </HomeShell>
    ))
    .with({ status: "error" }, (query) => (
      <HomeShell tab={tab}>
        <div className="my-6">
          <UserErrorAlert error={query.error} />
        </div>
      </HomeShell>
    ))
    .with({ status: "success" }, (query) => {
      const config = query.data;
      const effectiveMoviesSource =
        tab === "movies" && source !== undefined ? source : config.moviesSource;
      const effectiveTVShowsSource =
        tab === "tv-shows" && source !== undefined ? source : config.tvShowsSource;

      const currentTVShowsResponse =
        tvShowsQuery.status === "success" && tvShowsQuery.data.source === effectiveTVShowsSource
          ? tvShowsQuery.data
          : undefined;

      const currentMoviesResponse =
        moviesQuery.status === "success" && moviesQuery.data.source === effectiveMoviesSource
          ? moviesQuery.data
          : undefined;

      const sourceSelector =
        tab === "movies" ? (
          <MoviesSourceSelect
            value={effectiveMoviesSource}
            onChange={(moviesSource) => {
              patchConfig({ moviesSource });
              void navigate({
                to: "/movies",
                search: (prev) => ({ ...prev, source: moviesSource }),
                replace: true,
              });
            }}
          />
        ) : (
          <TVShowsSourceSelect
            value={effectiveTVShowsSource}
            onChange={(tvShowsSource) => {
              patchConfig({ tvShowsSource });
              void navigate({
                to: "/tv-shows",
                search: (prev) => ({ ...prev, source: tvShowsSource }),
                replace: true,
              });
            }}
          />
        );

      const visibleCount =
        tab === "movies"
          ? (currentMoviesResponse?.movies.length ?? null)
          : (currentTVShowsResponse?.shows.length ?? null);
      const noun =
        tab === "movies"
          ? visibleCount === 1
            ? "title"
            : "titles"
          : visibleCount === 1
            ? "show"
            : "shows";
      const countLabel = visibleCount != null ? `${visibleCount} ${noun}` : null;

      const setSort = (next: SortKey) => {
        void navigate({
          to: tab === "movies" ? "/movies" : "/tv-shows",
          search: (prev) => ({ ...prev, sort: next === SORT_DEFAULT ? undefined : next }),
          replace: true,
        });
      };

      const activeContent =
        tab === "movies" ? (
          <MoviesContent
            query={moviesQuery}
            source={effectiveMoviesSource}
            sort={sort}
            onPickAnotherSource={() => {
              const next = cycleSource(moviesSources, effectiveMoviesSource);
              if (next === undefined) return;
              patchConfig({ moviesSource: next });
              void navigate({
                to: "/movies",
                search: (prev) => ({ ...prev, source: next }),
                replace: true,
              });
            }}
          />
        ) : (
          <TVShowsContent
            query={tvShowsQuery}
            source={effectiveTVShowsSource}
            sort={sort}
            onPickAnotherSource={() => {
              const next = cycleSource(tvShowsSources, effectiveTVShowsSource);
              if (next === undefined) return;
              patchConfig({ tvShowsSource: next });
              void navigate({
                to: "/tv-shows",
                search: (prev) => ({ ...prev, source: next }),
                replace: true,
              });
            }}
          />
        );

      return (
        <HomeShell tab={tab} onOpenSearch={openSearch}>
          <PageHeading tab={tab} />
          <SortRow count={countLabel}>
            <div className={tabsContainerClass} role="radiogroup" aria-label="sort movies by">
              <SortPill
                active={sort === "popular"}
                className="h-8 text-base sm:h-7 sm:text-sm"
                onClick={() => setSort("popular")}
              >
                <Flame aria-hidden="true" />
                popular
              </SortPill>
              <SortPill
                active={sort === "rating"}
                className="h-8 text-base sm:h-7 sm:text-sm"
                onClick={() => setSort("rating")}
              >
                <Star aria-hidden="true" />
                rating
              </SortPill>
              <SortPill
                active={sort === "recent"}
                className="h-8 text-base sm:h-7 sm:text-sm"
                onClick={() => setSort("recent")}
              >
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

          {searchState !== "unmounted" ? (
            <Suspense fallback={null}>
              <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
            </Suspense>
          ) : null}
        </HomeShell>
      );
    })
    .exhaustive();
}

export { parseMoviesSource, parseTVShowsSource };

function BingeBrand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2">
      <img
        src="/logo.png"
        width={22}
        height={22}
        alt=""
        className="border-border-strong rounded border"
      />
      <h1 className="text-fg-1 m-0 truncate font-serif text-lg leading-7 font-normal tracking-[-0.01em]">
        binge.institute
      </h1>
    </Link>
  );
}

function HomeShell({
  tab,
  onOpenSearch,
  children,
}: {
  tab: CatalogTab;
  onOpenSearch?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StickyHeader
        brand={<BingeBrand />}
        tabs={
          <Tabs value={tab}>
            <TabsList>
              <TabsTrigger
                value="movies"
                render={<Link to="/movies" search={{ sort: undefined, source: undefined }} />}
              >
                <Film aria-hidden="true" />
                movies
              </TabsTrigger>
              <TabsTrigger
                value="tv-shows"
                render={<Link to="/tv-shows" search={{ sort: undefined, source: undefined }} />}
              >
                <Tv aria-hidden="true" />
                tv shows
              </TabsTrigger>
            </TabsList>
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-5">
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

function PageHeading({ tab }: { tab: CatalogTab }) {
  return (
    <div className="flex items-end justify-between gap-4 pt-5 pb-2.5 sm:pt-7 sm:pb-3.5">
      <h2 className="m-0 leading-none">{tab === "movies" ? "movies" : "tv shows"}</h2>
    </div>
  );
}

type MoviesContentProps = {
  query: ReturnType<typeof useMoviesQuery>;
  source: UserSettings["moviesSource"];
  sort: SortKey;
  onPickAnotherSource: () => void;
};

function MoviesContent({ query, source, sort, onPickAnotherSource }: MoviesContentProps) {
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
              render={<Link to="/movies/$id" params={{ id: movie.id }} search={(prev) => prev} />}
            />
          ))}
        </PosterGrid>
      );
    })
    .exhaustive();
}

type TVShowsContentProps = {
  query: ReturnType<typeof useTVShowsQuery>;
  source: UserSettings["tvShowsSource"];
  sort: SortKey;
  onPickAnotherSource: () => void;
};

function TVShowsContent({ query, source, sort, onPickAnotherSource }: TVShowsContentProps) {
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
              render={
                <Link to="/tv-shows/$id" params={{ id: show.imdbId }} search={{ season: 1 }} />
              }
            />
          ))}
        </PosterGrid>
      );
    })
    .exhaustive();
}

function PosterGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 pb-8 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
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
    <div className="grid grid-cols-2 gap-3 pb-8 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
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
    <div className="border-border-strong -mx-4 mb-3.5 flex items-center gap-2 border-y px-4 py-2.5 sm:mx-0 sm:mb-4.5 sm:px-0 sm:py-2">
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
            alt=""
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
