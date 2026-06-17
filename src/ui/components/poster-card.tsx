import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ArrowUpRight, Star } from "lucide-react";
import type { CSSProperties, ImgHTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/cn";
import { slotAttr } from "../lib/slot-attr";

type PosterCardProps = useRender.ComponentProps<"article"> & {
  title: string;
  image?: string | null;
  imageFetchPriority?: ImgHTMLAttributes<HTMLImageElement>["fetchPriority"];
  imageLoading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  rating?: string | null;
  ratingHref?: string | null;
  year?: string | null;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function PosterCard({
  title,
  image,
  imageFetchPriority = "auto",
  imageLoading = "lazy",
  rating,
  ratingHref,
  year,
  footer,
  className,
  style,
  render,
  ...props
}: PosterCardProps) {
  const interactive = render !== undefined;
  return useRender({
    defaultTagName: "article",
    props: mergeProps<"article">(
      {
        ...slotAttr("poster-card"),
        className: cn(
          "group bg-surface border-border-strong motion-safe:ease-out motion-safe:duration-base flex flex-col overflow-hidden rounded border no-underline motion-safe:transition-[transform]",
          interactive &&
            "cursor-pointer motion-safe:hover-hover:hover:-translate-y-px active:translate-y-0 active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app",
          className,
        ),
        style,
        children: (
          <>
            <div className="bg-app border-border-strong relative aspect-[2/3] border-b">
              {image ? (
                <img
                  src={image}
                  alt=""
                  decoding="async"
                  fetchPriority={imageFetchPriority}
                  loading={imageLoading}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="text-fg-2 flex h-full w-full items-end p-2.5 font-serif text-sm"
                >
                  {title}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 px-3 pt-2.5 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="text-fg-3 flex min-w-0 flex-col gap-1 text-base sm:text-sm">
                <h2
                  title={title}
                  className="text-fg-1 m-0 truncate text-base leading-tight sm:text-lg"
                >
                  {title}
                </h2>
                {(rating != null || ratingHref || year != null) && (
                  <div className="flex items-center gap-1.5 tabular-nums">
                    {rating != null && (
                      <span className="flex items-center gap-1">
                        <Star
                          className="size-3.5 fill-rating-amber text-rating-amber"
                          strokeWidth={0}
                          aria-hidden="true"
                        />
                        <span className="text-fg-1">{rating}</span>
                      </span>
                    )}
                    {ratingHref ? (
                      <>
                        {rating != null && <span className="text-fg-4">·</span>}
                        <span
                          role="link"
                          tabIndex={0}
                          title="View on IMDb"
                          className="text-fg-2 hover-hover:hover:text-fg-1 inline-flex cursor-pointer items-center gap-0.5 transition-colors"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            window.open(ratingHref, "_blank", "noopener,noreferrer");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              window.open(ratingHref, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          <span>IMDb</span>
                          <ArrowUpRight className="size-3 shrink-0" strokeWidth={1.25} />
                        </span>
                      </>
                    ) : null}
                    {year != null && (
                      <>
                        {(rating != null || ratingHref) && <span className="text-fg-4">·</span>}
                        <span>{year}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              {footer ? <div className="w-full sm:w-auto sm:shrink-0">{footer}</div> : null}
            </div>
          </>
        ),
      },
      props,
    ),
    render,
    state: { slot: "poster-card" },
  });
}

export { PosterCard };
