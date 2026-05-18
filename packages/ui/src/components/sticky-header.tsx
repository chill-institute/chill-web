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
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:flex sm:px-5">
        <div className="min-w-0">{brand}</div>
        {tabs ? (
          <div className="min-w-0 justify-self-start sm:justify-self-auto">{tabs}</div>
        ) : null}
        {children}
        {right ? (
          <div className="-mr-2 flex items-center justify-end gap-0.5 sm:mr-0 sm:ml-auto sm:gap-1">
            {right}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export { StickyHeader };
