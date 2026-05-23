import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../../../lib/cn";
import { alertVariants } from "./variants";

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
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
