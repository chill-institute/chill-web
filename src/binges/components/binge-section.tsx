import { useState, type CSSProperties } from "react";
import { cn } from "@/ui/lib/cn";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, HandHeart, Pencil, Plus, Star } from "lucide-react";

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
import { useBingeQuery, useBingesQuery } from "@/binges/queries/binges";
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

  const showBinge = (id: string | undefined) =>
    void navigate({ to: "/", search: id ? { binge: id } : {}, replace: true });
  const showCurator = (name: string | undefined) =>
    void navigate({ to: "/", search: name ? { curator: name } : {}, replace: true });
  const close = () => setOverlay({ kind: "none" });

  if (bingesQuery.status !== "success") {
    return null;
  }

  const { binges, canCurate, curatorName } = bingesQuery.data;
  const current = curatorFilter ? undefined : wantsOther ? bingeQuery.data?.binge : latest;
  const loadingOther = wantsOther && bingeQuery.status === "pending";

  if (!latest && !canCurate) {
    return null;
  }

  const withSidebar = !curatorFilter && latest !== undefined;
  const body = loadingOther ? (
    <BingeSkeleton />
  ) : wantsOther && bingeQuery.status === "error" ? (
    <UserErrorAlert error={bingeQuery.error} />
  ) : current ? (
    <BingeBody
      binge={current}
      onOpenItem={(item) => setOverlay({ kind: "item", item })}
      onOpenCurator={showCurator}
    />
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
          onSelect={(id) => showBinge(id === latest?.id ? undefined : id)}
          onOpenCurator={showCurator}
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
              onSelect={(id) => showBinge(id === latest?.id ? undefined : id)}
              onOpenCurator={showCurator}
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
            showBinge(saved.id);
          }}
          onDeleted={() => {
            close();
            showBinge(undefined);
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

function BingeBody({
  binge,
  onOpenItem,
  onOpenCurator,
}: {
  binge: Binge;
  onOpenItem: (item: BingeItem) => void;
  onOpenCurator: (name: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-2xl leading-hero sm:text-3xl">{binge.title}</h2>
        <p className="text-fg-3 m-0 text-sm">
          by <CuratorName name={binge.curatorName} onOpen={onOpenCurator} />
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
  const body = (
    <>
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
        <span className="text-fg-1 font-serif text-xl leading-tight tracking-heading sm:text-2xl">
          {title}
        </span>
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
          <ExternalIMDbLink href={imdbHref} />
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
    </>
  );
  const rowClassName =
    "flex w-full items-start gap-3 py-3.5 text-left sm:gap-4 sm:py-4 px-2 rounded";

  if (!resolved) {
    return <div className={rowClassName}>{body}</div>;
  }
  return (
    <button
      type="button"
      aria-label={`${item.title} details`}
      onClick={onOpen}
      className={`${rowClassName} hover-hover:hover:bg-surface motion-safe:transition-colors motion-safe:duration-fast cursor-pointer focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app focus-visible:outline-none`}
    >
      {body}
    </button>
  );
}

function ExternalIMDbLink({ href }: { href: string }) {
  const open = () => window.open(href, "_blank", "noopener,noreferrer");
  return (
    <span
      role="link"
      tabIndex={0}
      title="View on IMDb"
      className="text-fg-2 hover-hover:hover:text-fg-1 inline-flex cursor-pointer items-center gap-0.5 transition-colors"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        open();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          open();
        }
      }}
    >
      <span>IMDb</span>
      <ArrowUpRight className="size-3 shrink-0" strokeWidth={1.25} />
    </span>
  );
}

/**
 * A curator's name that lists their binges. It is a span, not a button, because it also sits
 * inside the clickable rows of the binge list.
 */
function CuratorName({
  name,
  onOpen,
}: {
  name: string | undefined;
  onOpen: (name: string) => void;
}) {
  const key = curatorKey(name);
  if (!key) {
    return <>{curatorLabel(name)}</>;
  }
  const open = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen(key);
  };
  return (
    <span
      role="link"
      tabIndex={0}
      title={`binges by ${key}`}
      data-slot="binge-curator"
      className="text-fg-2 hover-hover:hover:text-fg-1 cursor-pointer underline decoration-dotted underline-offset-2 transition-colors"
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          open(event);
        }
      }}
    >
      {key}
    </span>
  );
}

function BingeIndex({
  binges,
  currentId,
  latestId,
  curator,
  sidebar = false,
  onSelect,
  onOpenCurator,
}: {
  binges: BingeSummary[];
  currentId: string | undefined;
  latestId: string | undefined;
  curator: string | undefined;
  sidebar?: boolean;
  onSelect: (id: string) => void;
  onOpenCurator: (name: string | undefined) => void;
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
          <Button size="sm" variant="ghost" onClick={() => onOpenCurator(undefined)}>
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
            <button
              type="button"
              aria-current={binge.id === currentId ? "true" : undefined}
              onClick={() => onSelect(binge.id)}
              className="aria-[current=true]:bg-surface hover-hover:hover:bg-surface focus-visible:ring-ring-focus focus-visible:ring-offset-app flex w-full cursor-pointer items-start gap-3 rounded px-2 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <BingePosterStrip urls={binge.posterUrls} />
              <span
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
                  sidebar && "lg:flex-col lg:items-start lg:gap-0.5",
                )}
              >
                <span className="text-fg-1 min-w-0 font-serif text-lg leading-tight tracking-heading">
                  {binge.title}
                  {binge.id === latestId ? (
                    <span className="text-fg-3 text-sm"> · latest</span>
                  ) : null}
                </span>
                <span className="text-fg-3 shrink-0 text-sm tabular-nums">
                  by <CuratorName name={binge.curatorName} onOpen={onOpenCurator} /> ·{" "}
                  {binge.itemCount} {binge.itemCount === 1 ? "title" : "titles"}
                  {binge.createdAt ? ` · ${formatBingeDate(binge.createdAt)}` : ""}
                </span>
              </span>
            </button>
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
