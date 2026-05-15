import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Star } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "../lib/cn";

type PosterCardProps = useRender.ComponentProps<"article"> & {
  title: string;
  image?: string | null;
  rating?: string | null;
  year?: string | null;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function PosterCard({
  title,
  image,
  rating,
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
            <div className="text-fg-3 flex flex-col gap-1 px-3 pt-2.5 pb-3 text-[0.8125rem]">
              <h3 className="text-fg-1 m-0 text-lg break-words">{title}</h3>
              {(rating != null || year != null) && (
                <div className="flex items-center gap-1.5 tabular-nums">
                  {rating != null && (
                    <>
                      <Star
                        className="size-3 fill-rating-amber text-rating-amber"
                        strokeWidth={0}
                        aria-hidden="true"
                      />
                      <span className="text-fg-1">{rating}</span>
                    </>
                  )}
                  {rating != null && year != null && <span className="text-fg-4">·</span>}
                  {year != null && <span>{year}</span>}
                </div>
              )}
              {footer}
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
