import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { match } from "ts-pattern";

import { MoviesSourceSelect } from "@/catalog/components/movies-source-select";
import { TVShowsSourceSelect } from "@/catalog/components/tv-shows-source-select";
import { ShellSettingsMenu } from "@/components/shell-settings-menu";
import { InstituteBrand, InstituteTabs } from "@/components/top-nav";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { Button } from "@/ui/components/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/ui/components/ui/empty";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { StickyHeader } from "@/ui/components/sticky-header";
import { PosterCard } from "@/ui/components/poster-card";
import { InstituteFooter } from "@/ui/components/institute-footer";
import { SortRow } from "@/ui/components/sort-row";
import { SignInRedirect } from "@/auth/components/sign-in-redirect";
import { useAuth } from "@/auth/auth";

import { writeLastTab } from "@/catalog/hooks/use-last-tab";
import { useMoviesQuery } from "@/catalog/queries/movies";
import { useSaveSettings, useSettingsQuery } from "@/catalog/queries/settings";
import { useTVShowsQuery } from "@/catalog/queries/tv-shows";
import {
  moviesSources,
  parseMoviesSource,
  parseTVShowsSource,
  tvShowsSources,
  applyCatalogAppSettingsPatch,
  toCatalogAppSettings,
  type CatalogAppSettings,
} from "@/catalog/lib/types";

type CatalogTab = "movies" | "tv-shows";

type CatalogPageProps = {
  tab: CatalogTab;
  source?: number;
};

export function CatalogPage({ tab, source }: CatalogPageProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  const configQuery = useSettingsQuery();
  const saveConfigMutation = useSaveSettings();
  const appSettings = configQuery.data ? toCatalogAppSettings(configQuery.data) : undefined;

  const isSourceParamOutOfSync =
    configQuery.status === "success" &&
    source !== undefined &&
    ((tab === "movies" && appSettings?.moviesSource !== source) ||
      (tab === "tv-shows" && appSettings?.tvShowsSource !== source));
  const shouldFetchCatalog =
    configQuery.status === "success" &&
    !configQuery.isFetching &&
    !isSourceParamOutOfSync &&
    !saveConfigMutation.isPending;
  const moviesQuery = useMoviesQuery({ enabled: shouldFetchCatalog });
  const tvShowsQuery = useTVShowsQuery({ enabled: shouldFetchCatalog });

  useEffect(() => {
    writeLastTab(tab);
  }, [tab]);

  useEffect(() => {
    if (
      configQuery.status !== "success" ||
      configQuery.isFetching ||
      source === undefined ||
      !isSourceParamOutOfSync
    ) {
      return;
    }
    if (tab === "movies") {
      saveConfigMutation.flush(
        applyCatalogAppSettingsPatch(configQuery.data, { moviesSource: source }),
      );
      return;
    }
    saveConfigMutation.flush(
      applyCatalogAppSettingsPatch(configQuery.data, { tvShowsSource: source }),
    );
  }, [
    configQuery.data,
    configQuery.isFetching,
    configQuery.status,
    isSourceParamOutOfSync,
    saveConfigMutation,
    source,
    tab,
  ]);

  function patchConfig(patch: Partial<CatalogAppSettings>) {
    if (!configQuery.data) return;
    saveConfigMutation.mutate(applyCatalogAppSettingsPatch(configQuery.data, patch));
  }

  if (!auth.isAuthenticated) {
    return <SignInRedirect />;
  }

  return match(configQuery)
    .with({ status: "pending" }, () => (
      <HomeShell tab={tab}>
        <PageHeading tab={tab} controls={<SortRowSkeleton />} />
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
      const config = toCatalogAppSettings(query.data);
      const effectiveMoviesSource =
        tab === "movies" && source !== undefined ? source : config.moviesSource;
      const effectiveTVShowsSource =
        tab === "tv-shows" && source !== undefined ? source : config.tvShowsSource;

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

      const activeContent =
        tab === "movies" ? (
          <MoviesContent
            query={moviesQuery}
            source={effectiveMoviesSource}
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
        <HomeShell tab={tab}>
          <PageHeading
            tab={tab}
            controls={<SortRow className="mb-0 sm:justify-end lg:mb-0">{sourceSelector}</SortRow>}
          />

          {activeContent}

          {saveConfigMutation.error ? (
            <UserErrorAlert className="mt-4" error={saveConfigMutation.error} />
          ) : null}
        </HomeShell>
      );
    })
    .exhaustive();
}

export { parseMoviesSource, parseTVShowsSource };

function HomeShell({ tab, children }: { tab: CatalogTab; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StickyHeader
        brand={<InstituteBrand />}
        tabs={<InstituteTabs active={tab} />}
        right={<ShellSettingsMenu />}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-5">{children}</main>
      <InstituteFooter />
    </div>
  );
}

function PageHeading({ tab, controls }: { tab: CatalogTab; controls?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pt-5 pb-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pt-7">
      <h2 className="m-0 text-2xl leading-none sm:text-3xl">
        {tab === "movies" ? "movies" : "tv shows"}
      </h2>
      {controls ? <div className="w-full sm:ml-auto sm:w-auto">{controls}</div> : null}
    </div>
  );
}

type MoviesContentProps = {
  query: ReturnType<typeof useMoviesQuery>;
  source: CatalogAppSettings["moviesSource"];
  onPickAnotherSource: () => void;
};

function MoviesContent({ query, source, onPickAnotherSource }: MoviesContentProps) {
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
          {movies.data.movies.map((movie, index) => (
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
  source: CatalogAppSettings["tvShowsSource"];
  onPickAnotherSource: () => void;
};

function TVShowsContent({ query, source, onPickAnotherSource }: TVShowsContentProps) {
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
          {shows.data.shows.map((show, index) => (
            <PosterCard
              key={show.imdbId}
              className="animate-reveal"
              style={staggerDelay(index)}
              title={show.title}
              image={show.posterUrl ?? null}
              rating={show.rating != null ? show.rating.toFixed(1) : null}
              year={show.year != null ? String(show.year) : null}
              render={
                <Link
                  to="/tv-shows/$id"
                  params={{ id: show.imdbId }}
                  search={{
                    season: 1,
                    source,
                  }}
                />
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
    <div className="-mx-4 flex items-center gap-4 overflow-x-auto px-4 sm:mx-0 sm:justify-end sm:px-0">
      <Skeleton className="h-8 w-28 shrink-0 rounded-none" />
      <Skeleton className="h-8 w-16 shrink-0 rounded-none" />
      <Skeleton className="h-8 w-24 shrink-0 rounded-none" />
      <Skeleton className="h-8 w-14 shrink-0 rounded-none" />
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

function cycleSource(list: ReadonlyArray<number>, current: number): number | undefined {
  const idx = list.indexOf(current);
  return list[idx < 0 ? 0 : (idx + 1) % list.length];
}
