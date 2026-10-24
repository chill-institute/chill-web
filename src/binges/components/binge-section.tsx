import { useState, type CSSProperties } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";

import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { BingeEditor } from "@/binges/components/binge-editor";
import { BingeItemDetail } from "@/binges/components/binge-item-detail";
import { BingePicker } from "@/binges/components/binge-picker";
import { BingeMediaType, type Binge, type BingeItem } from "@/binges/lib/types";
import { useBingeQuery, useBingesQuery } from "@/binges/queries/binges";
import { PosterCard } from "@/ui/components/poster-card";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";

const routeApi = getRouteApi("/");
const SKELETON_SLOTS = Array.from({ length: 6 }, (_, index) => `binge-skel-${index}`);

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
        <p className="text-fg-3 m-0 text-xs uppercase tracking-[0.08em]">
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
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-7 pb-10 sm:pt-8"
    >
      {children}
    </section>
  );
}

function BingeBody({ binge, onOpenItem }: { binge: Binge; onOpenItem: (item: BingeItem) => void }) {
  return (
    <>
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 className="m-0 text-2xl leading-[1.08] sm:text-3xl">{binge.title}</h2>
        {binge.blurb ? (
          <p className="text-fg-2 m-0 text-sm whitespace-pre-line sm:text-base">{binge.blurb}</p>
        ) : null}
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {binge.items.map((item, index) => (
          <li
            key={item.imdbId}
            data-slot="binge-item"
            className="animate-reveal flex min-w-0 flex-col gap-1.5"
            style={staggerDelay(index)}
          >
            {item.mediaType === BingeMediaType.UNSPECIFIED ? (
              <PosterCard
                title={item.imdbId}
                image={null}
                ratingHref={item.externalUrl || `https://imdb.com/title/${item.imdbId}`}
              />
            ) : (
              <PosterCard
                title={item.title}
                image={item.posterUrl || null}
                imageFetchPriority={index < 6 ? "high" : "auto"}
                imageLoading={index < 6 ? "eager" : "lazy"}
                rating={item.rating > 0 ? item.rating.toFixed(1) : null}
                ratingHref={item.externalUrl || undefined}
                year={item.year > 0 ? String(item.year) : null}
                render={
                  <button
                    type="button"
                    aria-label={`${item.title} details`}
                    onClick={() => onOpenItem(item)}
                  />
                }
              />
            )}
            {item.comment ? (
              <p className="text-fg-2 m-0 px-0.5 text-sm leading-snug">{item.comment}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function BingeSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56 rounded sm:h-8" />
        <Skeleton className="h-4 w-80 max-w-full rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {SKELETON_SLOTS.map((slot) => (
          <div key={slot} className="flex flex-col gap-1.5">
            <Skeleton className="aspect-[2/3] w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function staggerDelay(index: number): CSSProperties {
  return { animationDelay: `${Math.min(index * 25, 350)}ms` };
}
