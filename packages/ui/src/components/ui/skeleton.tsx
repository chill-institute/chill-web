import { cn } from "../../lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-skeleton rounded motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
