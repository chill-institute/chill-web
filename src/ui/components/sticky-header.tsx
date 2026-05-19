import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type StickyHeaderProps = {
  children?: ReactNode;
  brand: ReactNode;
  tabs?: ReactNode;
  right?: ReactNode;
  className?: string;
};

function StickyHeader({ brand, tabs, right, children, className }: StickyHeaderProps) {
  const center = tabs ?? children;

  return (
    <header
      data-slot="sticky-header"
      className={cn("border-border-strong bg-surface sticky top-0 z-40 border-b py-2.5", className)}
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 sm:px-5">
        <div className="min-w-0 justify-self-start">{brand}</div>
        {center ? <div className="min-w-0 justify-self-center">{center}</div> : null}
        {right ? (
          <div className="flex items-center justify-end gap-0.5 justify-self-end sm:gap-1">
            {right}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export { StickyHeader };
