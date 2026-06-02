import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../../lib/cn";
import { alertVariants } from "./variants";

function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert };
