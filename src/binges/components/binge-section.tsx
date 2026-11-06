import { useState, type CSSProperties } from "react";
import { cn } from "@/ui/lib/cn";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { HandHeart, Pencil, Plus, Star } from "lucide-react";

import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { BingeEditor } from "@/binges/components/binge-editor";
import { BingeItemDetail } from "@/binges/components/binge-item-detail";
import {
  BingeMediaType,
  curatorKey,
  curatorLabel,
  formatBingeDate,
  type Binge,
  type BingeItem,
  type BingeSummary,
} from "@/binges/lib/types";
import { useBingeQuery, useBingesQuery, useForgetBinge } from "@/binges/queries/binges";
import { ExternalIMDbLink } from "@/ui/components/external-imdb-link";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";

const routeApi = getRouteApi("/");
const SKELETON_SLOTS = Array.from({ length: 3 }, (_, index) => `binge-skel-${index}`);
const BINGE_INDEX_PREVIEW = 20;

type Overlay =
  | { kind: "none" }
  | { kind: "editor"; binge?: Binge }
  | { kind: "item"; item: BingeItem };

export function BingeSection() {
  const { binge: requestedId, curator } = routeApi.useSearch();
  const navigate = useNavigate();
  const bingesQuery = useBingesQuery();
  const latest = bingesQuery.data?.latest;
  const curatorFilter = curatorKey(curator);
  const wantsOther = !curatorFilter && requestedId !== undefined && requestedId !== latest?.id;
  const bingeQuery = useBingeQuery(wantsOther ? requestedId : undefined);
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });
  const forgetBinge = useForgetBinge();

  const showBinge = (id: string | undefined) =>
    navigate({ to: "/", search: id ? { binge: id } : {}, replace: true });
  const close = () => setOverlay({ kind: "none" });

  if (!bingesQuery.data) {
    return null;
  }

  const { binges, canCurate, curatorName } = bingesQuery.data;
  const other = bingeQuery.data?.binge;
  const current = curatorFilter ? undefined : wantsOther ? other : latest;

  if (!latest && !canCurate) {
    return null;
  }

  const withSidebar = !curatorFilter && latest !== undefined;
  const body = current ? (
    <BingeBody binge={current} onOpenItem={(item) => setOverlay({ kind: "item", item })} />
  ) : wantsOther && bingeQuery.status === "error" ? (
    <UserErrorAlert error={bingeQuery.error} />
  ) : wantsOther ? (
    <BingeSkeleton />
  ) : (
    <p className="text-fg-2 m-0 text-sm">no binges yet. publish the first one.</p>
  );

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-fg-3 m-0 text-sm">
        {curatorFilter ? "binges" : current && current.id !== latest?.id ? "binge" : "latest binge"}
      </p>
      <div className="flex items-center gap-2">
        {canCurate && current ? (
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit this binge"
            onClick={() => setOverlay({ kind: "editor", binge: current })}
          >
            <Pencil />
            edit
          </Button>
        ) : null}
        {canCurate ? (
          <Button size="sm" variant="primary" onClick={() => setOverlay({ kind: "editor" })}>
            <Plus />
            new binge
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <BingeFrame wide={withSidebar}>
      {withSidebar ? null : header}
      {curatorFilter ? (
        <BingeIndex
          binges={binges}
          currentId={undefined}
          latestId={latest?.id}
          curator={curatorFilter}
          onSelect={(id) => void showBinge(id === latest?.id ? undefined : id)}
          onShowAll={() => void showBinge(undefined)}
        />
      ) : withSidebar ? (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            {header}
            {body}
          </div>
          <div className="flex flex-col gap-6 lg:sticky lg:top-6">
            <HandpickedCallout />
            <BingeIndex
              binges={binges}
              currentId={current?.id}
              latestId={latest?.id}
              curator={undefined}
              sidebar
              onSelect={(id) => void showBinge(id === latest?.id ? undefined : id)}
              onShowAll={() => void showBinge(undefined)}
            />
          </div>
        </div>
      ) : (
        body
      )}

      {overlay.kind === "editor" ? (
        <BingeEditor
          binge={overlay.binge}
          curatorName={curatorName}
          onClose={close}
          onSaved={(saved) => {
            close();
            void showBinge(saved.id);
          }}
          onDeleted={(id) => {
            close();
            void showBinge(undefined).then(() => forgetBinge(id));
          }}
        />
      ) : null}
      {overlay.kind === "item" ? <BingeItemDetail item={overlay.item} onClose={close} /> : null}
    </BingeFrame>
  );
}

function BingeFrame({ wide = false, children }: { wide?: boolean; children: React.ReactNode }) {
  return (
    <section
      aria-label="Binges"
      data-slot="binge-section"
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-7 pb-10 sm:pt-8",
        wide && "sm:px-5 lg:max-w-7xl",
      )}
    >
      {children}
    </section>
  );
}

function HandpickedCallout() {
  return (
    <aside
      data-slot="binge-handpicked"
      className="border-border-soft bg-surface-2 flex items-start gap-3 rounded border p-4"
    >
      <HandHeart
        className="text-fg-2 mt-0.5 size-5 shrink-0"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <p className="text-fg-1 m-0 font-serif text-lg leading-tight tracking-heading">
          handpicked by a real person
        </p>
        <p className="text-fg-2 m-0 text-sm">
          every binge is chosen and written up by a person, not an algorithm.
        </p>
      </div>
    </aside>
  );
}

function BingeBody({ binge, onOpenItem }: { binge: Binge; onOpenItem: (item: BingeItem) => void }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-2xl leading-hero sm:text-3xl">{binge.title}</h2>
        <p className="text-fg-3 m-0 text-sm">
          by <CuratorName name={binge.curatorName} />
          {binge.createdAt ? ` · ${formatBingeDate(binge.createdAt)}` : ""}
        </p>
        {binge.blurb ? (
          <p className="text-fg-2 m-0 text-sm whitespace-pre-line sm:text-base">{binge.blurb}</p>
        ) : null}
      </div>
      <ol className="border-border-faint m-0 flex list-none flex-col border-t p-0">
        {binge.items.map((item, index) => (
          <li
            key={item.imdbId}
            data-slot="binge-item"
            className="border-border-faint animate-reveal border-b"
            style={{ "--reveal-delay": `${staggerDelayMs(index)}ms` } as CSSProperties}
          >
            <BingeRow item={item} position={index + 1} onOpen={() => onOpenItem(item)} />
          </li>
        ))}
      </ol>
    </>
  );
}

function BingeRow({
  item,
  position,
  onOpen,
}: {
  item: BingeItem;
  position: number;
  onOpen: () => void;
}) {
  const resolved = item.mediaType !== BingeMediaType.UNSPECIFIED;
  const title = resolved ? item.title : item.imdbId;
  const imdbHref = item.externalUrl || `https://imdb.com/title/${item.imdbId}`;
  const titleClassName =
    "text-fg-1 text-left font-serif text-xl leading-tight tracking-heading sm:text-2xl";
  return (
    <div
      className={cn(
        "relative flex w-full items-start gap-3 rounded px-2 py-3.5 text-left sm:gap-4 sm:py-4",
        resolved &&
          "hover-hover:hover:bg-surface motion-safe:transition-colors motion-safe:duration-fast",
      )}
    >
      <span
        aria-hidden="true"
        className="text-fg-3 w-5 shrink-0 pt-1 text-right font-serif text-base tabular-nums sm:w-6 sm:text-lg"
      >
        {position}
      </span>
      <span className="bg-app border-border-strong relative aspect-[2/3] w-[72px] shrink-0 overflow-hidden rounded border sm:w-[92px]">
        {resolved && item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            decoding="async"
            loading={position <= 3 ? "eager" : "lazy"}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="text-fg-3 flex h-full w-full items-end p-2 font-serif text-xs">
            {title}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {resolved ? (
          <button
            type="button"
            aria-label={`${item.title} details`}
            onClick={onOpen}
            className={cn(titleClassName, stretchedActionClassName)}
          >
            {title}
          </button>
        ) : (
          <span className={titleClassName}>{title}</span>
        )}
        <span className="text-fg-2 flex flex-wrap items-center gap-1.5 text-sm tabular-nums">
          {resolved && item.rating > 0 ? (
            <span className="flex items-center gap-1">
              <Star
                className="fill-rating-amber text-rating-amber size-3.5"
                strokeWidth={0}
                aria-hidden="true"
              />
              <span className="text-fg-1">{item.rating.toFixed(1)}</span>
            </span>
          ) : null}
          {resolved && item.rating > 0 ? <span className="text-fg-4">·</span> : null}
          <ExternalIMDbLink href={imdbHref} className="relative z-10" />
          {resolved && item.year > 0 ? (
            <>
              <span className="text-fg-4">·</span>
              <span>{item.year}</span>
            </>
          ) : null}
          <span className="text-fg-4">·</span>
          <span className="text-fg-3">
            {item.mediaType === BingeMediaType.TV_SHOW
              ? "tv show"
              : resolved
                ? "movie"
                : "not found"}
          </span>
        </span>
        {item.comment ? (
          <span className="text-fg-2 mt-1 block max-w-[62ch] text-sm leading-snug whitespace-pre-line sm:text-base">
            {item.comment}
          </span>
        ) : null}
      </span>
    </div>
  );
}

const stretchedActionClassName =
  "cursor-pointer after:absolute after:inset-0 after:rounded after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring-focus focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-app";

function CuratorName({ name }: { name: string | undefined }) {
  const key = curatorKey(name);
  if (!key) {
    return <>{curatorLabel(name)}</>;
  }
  return (
    <Link
      to="/"
      search={{ curator: key }}
      replace
      title={`binges by ${key}`}
      data-slot="binge-curator"
      className="text-fg-2 hover-hover:hover:text-fg-1 relative z-10 underline decoration-dotted underline-offset-2 transition-colors"
    >
      {key}
    </Link>
  );
}

function BingeIndex({
  binges,
  currentId,
  latestId,
  curator,
  sidebar = false,
  onSelect,
  onShowAll,
}: {
  binges: BingeSummary[];
  currentId: string | undefined;
  latestId: string | undefined;
  curator: string | undefined;
  sidebar?: boolean;
  onSelect: (id: string) => void;
  onShowAll: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filter = curatorKey(curator);
  const listed = binges.filter((binge) => !filter || curatorKey(binge.curatorName) === filter);
  const visible = expanded ? listed : listed.slice(0, BINGE_INDEX_PREVIEW);
  const hidden = listed.length - visible.length;

  return (
    <div data-slot="binge-index" className={cn("flex flex-col gap-2", !sidebar && "mt-2")}>
      {filter ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-fg-3 m-0 text-sm">
            binges by <span className="text-fg-1">{filter}</span>
          </p>
          <Button size="sm" variant="ghost" onClick={onShowAll}>
            all binges
          </Button>
        </div>
      ) : (
        <p className="text-fg-3 m-0 text-sm">all binges</p>
      )}
      {filter && listed.length === 0 ? (
        <p className="text-fg-2 m-0 text-sm">no binges by {filter} yet.</p>
      ) : null}
      <ul className="border-border-faint m-0 flex list-none flex-col border-t p-0">
        {visible.map((binge) => (
          <li key={binge.id} className="border-border-faint border-b">
            <div
              data-slot="binge-index-row"
              className="has-[[aria-current=true]]:bg-surface hover-hover:hover:bg-surface relative flex w-full items-start gap-3 rounded px-2 py-2.5 text-left"
            >
              <BingePosterStrip urls={binge.posterUrls} />
              <span
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
                  sidebar && "lg:flex-col lg:items-start lg:gap-0.5",
                )}
              >
                <button
                  type="button"
                  aria-current={binge.id === currentId ? "true" : undefined}
                  onClick={() => onSelect(binge.id)}
                  className={cn(
                    "text-fg-1 min-w-0 text-left font-serif text-lg leading-tight tracking-heading",
                    stretchedActionClassName,
                  )}
                >
                  {binge.title}
                  {binge.id === latestId ? (
                    <span className="text-fg-3 text-sm"> · latest</span>
                  ) : null}
                </button>
                <span className="text-fg-3 shrink-0 text-sm tabular-nums">
                  by <CuratorName name={binge.curatorName} /> · {binge.itemCount}{" "}
                  {binge.itemCount === 1 ? "title" : "titles"}
                  {binge.createdAt ? ` · ${formatBingeDate(binge.createdAt)}` : ""}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <Button size="sm" variant="ghost" className="self-start" onClick={() => setExpanded(true)}>
          show all {listed.length} binges
        </Button>
      ) : null}
    </div>
  );
}

function BingePosterStrip({ urls }: { urls: readonly string[] }) {
  if (urls.length === 0) {
    return null;
  }
  return (
    <span aria-hidden="true" data-slot="binge-poster-strip" className="flex shrink-0 gap-1">
      {urls.map((url, position) => (
        <span
          key={`${position}:${url}`}
          className="bg-app border-border-strong relative aspect-[2/3] w-8 overflow-hidden rounded-sm border"
        >
          <img
            src={url}
            alt=""
            decoding="async"
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        </span>
      ))}
    </span>
  );
}

function BingeSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56 sm:h-8" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="border-border-faint flex flex-col border-t">
        {SKELETON_SLOTS.map((slot) => (
          <div
            key={slot}
            className="border-border-faint flex gap-3 border-b py-3.5 sm:gap-4 sm:py-4"
          >
            <Skeleton className="h-4 w-5 sm:w-6" />
            <Skeleton className="aspect-[2/3] w-[72px] sm:w-[92px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-2/5" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function staggerDelayMs(index: number) {
  return Math.min(index * 25, 350);
}
