import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "../lib/cn";
import { tabItemActiveClass, tabItemBaseClass } from "./tabs";

type SortRowProps = {
  className?: string;
  children: ReactNode;
  count?: ReactNode;
};

function SortRow({ className, children, count }: SortRowProps) {
  return (
    <div
      data-slot="sort-row"
      className={cn(
        "border-border-strong text-fg-3 bg-surface/60 mb-4.5 flex flex-wrap items-center gap-3 border-y px-4 py-2 text-sm",
        className,
      )}
    >
      {children}
      {count != null ? (
        <span className="text-fg-3 ml-auto font-mono text-2xs tabular-nums">{count}</span>
      ) : null}
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
