import * as React from "react";

import { cn } from "../../../lib/cn";

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-fg-1",
        className,
      )}
      {...props}
    />
  );
}

export { AlertTitle };
