import type { ReactNode } from "react";

import { ModalCloseButton } from "@/ui/components/modal-close-button";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { DetailBackdropImage, DetailPosterImage } from "@/catalog/components/detail-media";

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
      <div className="text-fg-2 mt-2 flex flex-wrap items-center gap-2 text-base/6 sm:text-sm">
        {metadata}
      </div>
      {children}
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
