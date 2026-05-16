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
  return (
    <header
      data-slot="sticky-header"
      className={cn(
        "border-border-strong bg-surface/90 sticky top-0 z-40 border-b py-2.5 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-5">
        {brand}
        {tabs}
        {children}
        {right ? <div className="ml-auto flex items-center gap-0.5 sm:gap-1">{right}</div> : null}
      </div>
    </header>
  );
}

export { StickyHeader };
