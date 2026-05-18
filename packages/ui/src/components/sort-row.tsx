import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "../lib/cn";
import { tabItemActiveClass, tabItemBaseClass } from "./tabs";

type SortRowProps = {
  className?: string;
  children: ReactNode;
};

function SortRow({ className, children }: SortRowProps) {
  return (
    <div
      data-slot="sort-row"
      className={cn(
        "border-border-strong text-fg-3 bg-surface/60 -mx-4 mb-3.5 flex flex-col gap-1.5 border-y px-4 py-2 text-sm sm:mx-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-4 lg:mb-4.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type SortPillProps = ComponentPropsWithoutRef<typeof ButtonPrimitive> & {
  active?: boolean;
};

function SortPill({ active, className, ...props }: SortPillProps) {
  return (
    <ButtonPrimitive
      data-slot="sort-pill"
      data-active={active || undefined}
      aria-pressed={active}
      className={cn(tabItemBaseClass, active && tabItemActiveClass, className)}
      {...props}
    />
  );
}

function SortRowDivider() {
  return <span aria-hidden="true" className="bg-border-soft h-4 w-px" />;
}

export { SortRow, SortRowDivider, SortPill };
