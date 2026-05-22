import type { ReactNode } from "react";
import { ArrowUpRight, Star } from "lucide-react";

import { ModalCloseButton } from "@/ui/components/modal-close-button";
import { ResponsiveModal } from "@/ui/components/responsive-modal";
import { Badge } from "@/ui/components/ui/badge";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { cn } from "@/ui/lib/cn";
import { DetailBackdropImage, DetailPosterImage } from "@/catalog/components/detail-media";

const DETAIL_GENRE_LIMIT = 2;

export function getDetailGenreTags(genres: readonly string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of genres) {
    if (tags.length >= DETAIL_GENRE_LIMIT) break;
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(value);
  }
  return tags;
}

export function DetailResponsiveModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={description}
      desktopContentClassName="fixed top-1/2 left-1/2 max-h-[min(calc(100dvh-48px),760px)] w-[min(100vw-1rem,760px)] min-h-0 -translate-x-1/2 -translate-y-1/2 gap-0 border-0 bg-transparent p-0 shadow-none"
      drawerContentClassName="!max-h-[92dvh] overflow-hidden rounded-t-3xl border-x-0 border-t-0 border-b-0 bg-surface p-0 shadow-drawer"
    >
      {children}
    </ResponsiveModal>
  );
}

export function DetailModalShell({
  isDesktop,
  children,
}: {
  isDesktop: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        isDesktop
          ? "max-h-[min(calc(100dvh-48px),760px)] min-h-0 w-full max-w-[760px] overflow-hidden rounded-xl border border-border-strong bg-surface p-0 text-fg-1 shadow-modal flex flex-col"
          : "h-full min-h-0 w-full overflow-hidden bg-surface p-0 text-fg-1 flex flex-col"
      }
    >
      {children}
    </div>
  );
}

type DetailModalHeaderProps = {
  backdropUrl?: string;
  posterUrl?: string;
  posterAlt: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function DetailModalHeader({
  backdropUrl,
  posterUrl,
  posterAlt,
  closeLabel,
  onClose,
  children,
}: DetailModalHeaderProps) {
  return (
    <div className="relative flex h-[200px] shrink-0 items-end overflow-hidden sm:h-[220px]">
      <DetailBackdropImage key={backdropUrl ?? "no-backdrop"} url={backdropUrl} />
      <div className="from-surface via-surface/80 absolute inset-0 bg-linear-to-t via-30% to-transparent" />
      <div className="from-surface/50 absolute inset-0 bg-linear-to-r to-transparent to-60%" />

      <div className="relative z-10 flex w-full items-end gap-3.5 px-4 pb-4 sm:gap-4 sm:px-6 sm:pb-5">
        {posterUrl ? (
          <DetailPosterImage key={posterUrl} url={posterUrl} alt={posterAlt} />
        ) : (
          <Skeleton className="aspect-[2/3] w-[92px] shrink-0 rounded sm:w-[110px]" />
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <ModalCloseButton
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3"
      />
    </div>
  );
}

export function DetailModalHeaderText({
  titleId,
  title,
  metadata,
  children,
}: {
  titleId: string;
  title: string;
  metadata: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="text-fg-1 max-w-[560px]">
      <h2 id={titleId} className="m-0 text-2xl leading-[1.05] sm:text-3xl">
        {title}
      </h2>
      <div className="text-fg-2 mt-2 flex flex-wrap items-center gap-2 text-sm/5">{metadata}</div>
      {children}
    </div>
  );
}

export function DetailRatingMeta({ rating }: { rating?: number }) {
  return (
    <span className="flex items-center gap-1">
      <Star className="size-3.5 fill-rating-amber text-rating-amber" strokeWidth={0} />
      <span>{rating ? rating.toFixed(1) : "N/A"}</span>
    </span>
  );
}

export function DetailMetadataSeparator() {
  return <span className="text-fg-4">·</span>;
}

export function DetailYearMeta({ year }: { year?: number }) {
  if (!year) return null;
  return (
    <>
      <DetailMetadataSeparator />
      <span className="text-fg-3">{year}</span>
    </>
  );
}

export function DetailExternalLinkMeta({ url, label = "IMDb" }: { url?: string; label?: string }) {
  if (!url) return null;
  return (
    <>
      <DetailMetadataSeparator />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-fg-2 hover:text-fg-1 inline-flex min-h-6 items-center gap-0.5 transition-colors"
      >
        <span>{label}</span>
        <ArrowUpRight className="size-3 shrink-0" strokeWidth={1.25} />
      </a>
    </>
  );
}

export function DetailGenreBadges({
  genres,
  className,
}: {
  genres: readonly string[];
  className?: string;
}) {
  if (genres.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {genres.map((genre) => (
        <Badge key={genre} variant="outline" className="border-border-faint bg-surface-2/50">
          {genre}
        </Badge>
      ))}
    </div>
  );
}

export function DetailModalHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-52" />
    </div>
  );
}

export function DetailModalBody({
  children,
  movieScroll = false,
}: {
  children: ReactNode;
  movieScroll?: boolean;
}) {
  const dataProps = movieScroll ? { "data-movie-detail-scroll": true } : {};
  return (
    <div
      {...dataProps}
      className={cn(
        "flex min-h-0 flex-col gap-3.5 overflow-y-auto px-4 pt-2.5 pb-6 sm:px-6",
        "max-h-[calc(min(calc(100dvh-48px),760px)-220px)]",
      )}
    >
      {children}
    </div>
  );
}
