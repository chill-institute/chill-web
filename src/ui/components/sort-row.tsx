import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type SortRowProps = {
  className?: string;
  children: ReactNode;
};

function SortRow({ className, children }: SortRowProps) {
  return (
    <div
      data-slot="sort-row"
      className={cn(
        "text-fg-3 -mx-4 mb-3.5 flex flex-col gap-1.5 overflow-x-auto px-4 text-sm sm:mx-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-0 lg:mb-4.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { SortRow };
