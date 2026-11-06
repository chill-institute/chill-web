import { ArrowUpRight } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

import { cn } from "../lib/cn";

type ExternalIMDbLinkProps = {
  href: string;
  className?: string;
};

function ExternalIMDbLink({ href, className }: ExternalIMDbLinkProps) {
  const open = (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(href, "_blank", "noopener,noreferrer");
  };
  return (
    <span
      role="link"
      tabIndex={0}
      title="View on IMDb"
      className={cn(
        "text-fg-2 hover-hover:hover:text-fg-1 inline-flex cursor-pointer items-center gap-0.5 transition-colors",
        className,
      )}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") open(event);
      }}
    >
      <span>IMDb</span>
      <ArrowUpRight className="size-3 shrink-0" strokeWidth={1.25} />
    </span>
  );
}

export { ExternalIMDbLink };
