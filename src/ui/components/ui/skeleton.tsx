import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const skeletonVariants = cva("bg-skeleton motion-safe:animate-pulse", {
  variants: {
    shape: {
      default: "rounded",
      sm: "rounded-sm",
      none: "rounded-none",
    },
  },
  defaultVariants: {
    shape: "default",
  },
});

export function Skeleton({
  className,
  shape,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof skeletonVariants>) {
  return (
    <div data-slot="skeleton" className={cn(skeletonVariants({ shape }), className)} {...props} />
  );
}
