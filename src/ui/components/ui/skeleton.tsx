import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-skeleton rounded motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
