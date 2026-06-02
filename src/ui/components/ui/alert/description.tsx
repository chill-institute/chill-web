import type { ComponentProps } from "react";

import { cn } from "../../../lib/cn";

function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-fg-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-fg-1 [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

export { AlertDescription };
