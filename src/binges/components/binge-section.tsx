import { useState, type CSSProperties } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Pencil, Plus, Star } from "lucide-react";

import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { BingeEditor } from "@/binges/components/binge-editor";
import { BingeItemDetail } from "@/binges/components/binge-item-detail";
import { BingePicker } from "@/binges/components/binge-picker";
import { BingeMediaType, type Binge, type BingeItem } from "@/binges/lib/types";
import { useBingeQuery, useBingesQuery } from "@/binges/queries/binges";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";

const routeApi = getRouteApi("/");
const SKELETON_SLOTS = Array.from({ length: 3 }, (_, index) => `binge-skel-${index}`);

type Overlay =
  | { kind: "none" }
  | { kind: "picker" }
  | { kind: "editor"; binge?: Binge }
  | { kind: "item"; item: BingeItem };

export function BingeSection() {
  const { binge: requestedId } = routeApi.useSearch();
  const navigate = useNavigate();
  const bingesQuery = useBingesQuery();
  const latest = bingesQuery.data?.latest;
  const wantsOther = requestedId !== undefined && requestedId !== latest?.id;
  const bingeQuery = useBingeQuery(wantsOther ? requestedId : undefined);
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });

  const showBinge = (id: string | undefined) =>
    void navigate({ to: "/", search: id ? { binge: id } : {}, replace: true });
  const close = () => setOverlay({ kind: "none" });

  if (bingesQuery.status === "pending") {
    return (
      <BingeFrame>
        <BingeSkeleton />
      </BingeFrame>
    );
  }
  if (bingesQuery.status === "error") {
    return (
      <BingeFrame>
        <UserErrorAlert error={bingesQuery.error} />
      </BingeFrame>
    );
  }

  const { binges, canCurate } = bingesQuery.data;
  const current = wantsOther ? bingeQuery.data?.binge : latest;
  const loadingOther = wantsOther && bingeQuery.status === "pending";

  if (!latest && !canCurate) {
    return null;
  }

  return (
    <BingeFrame>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-fg-3 m-0 text-sm">
          {current && current.id !== latest?.id ? "binge" : "latest binge"}
        </p>
        <div className="flex items-center gap-2">
          {binges.length > 1 ? (
            <Button size="sm" onClick={() => setOverlay({ kind: "picker" })}>
              other binges
            </Button>
          ) : null}
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

      {loadingOther ? (
        <BingeSkeleton />
      ) : wantsOther && bingeQuery.status === "error" ? (
        <UserErrorAlert error={bingeQuery.error} />
      ) : current ? (
        <BingeBody binge={current} onOpenItem={(item) => setOverlay({ kind: "item", item })} />
      ) : (
        <p className="text-fg-2 m-0 text-sm">no binges yet. publish the first one.</p>
      )}

      {overlay.kind === "picker" ? (
        <BingePicker
          binges={binges}
          activeId={current?.id}
          onSelect={(id) => {
            showBinge(id === latest?.id ? undefined : id);
            close();
          }}
          onClose={close}
        />
      ) : null}
      {overlay.kind === "editor" ? (
        <BingeEditor
          binge={overlay.binge}
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

function BingeFrame({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Binges"
      data-slot="binge-section"
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-7 pb-10 sm:pt-8"
    >
      {children}
    </section>
  );
}

function BingeBody({ binge, onOpenItem }: { binge: Binge; onOpenItem: (item: BingeItem) => void }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-2xl leading-[1.08] sm:text-3xl">{binge.title}</h2>
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
            style={staggerDelay(index)}
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
        <span className="text-fg-1 font-serif text-xl leading-tight tracking-[-0.01em] sm:text-2xl">
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
    "flex w-full items-start gap-3 py-3.5 text-left sm:gap-4 sm:py-4 -mx-2 px-2 rounded";

  if (!resolved) {
    return <div className={rowClassName}>{body}</div>;
  }
  return (
    <button
      type="button"
      aria-label={`${item.title} details`}
      onClick={onOpen}
      className={`${rowClassName} hover-hover:hover:bg-hover motion-safe:transition-colors motion-safe:duration-fast cursor-pointer focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app focus-visible:outline-none`}
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

function BingeSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56 rounded sm:h-8" />
        <Skeleton className="h-4 w-80 max-w-full rounded" />
      </div>
      <div className="border-border-faint flex flex-col border-t">
        {SKELETON_SLOTS.map((slot) => (
          <div
            key={slot}
            className="border-border-faint flex gap-3 border-b py-3.5 sm:gap-4 sm:py-4"
          >
            <Skeleton className="h-4 w-5 rounded sm:w-6" />
            <Skeleton className="aspect-[2/3] w-[72px] rounded sm:w-[92px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-2/5 rounded" />
              <Skeleton className="h-4 w-1/4 rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-4 w-3/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function staggerDelay(index: number): CSSProperties {
  return { animationDelay: `${Math.min(index * 25, 350)}ms` };
}
