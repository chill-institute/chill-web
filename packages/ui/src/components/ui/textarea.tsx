import * as React from "react";

import { cn } from "../../lib/cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded border border-border-strong bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-fg-2 focus-visible:border-ring-focus focus-visible:ring-3 focus-visible:ring-ring-focus/50 disabled:cursor-not-allowed disabled:bg-surface-2/50 disabled:opacity-50 aria-invalid:border-error-text aria-invalid:ring-3 aria-invalid:ring-error-text/20 md:text-sm dark:bg-surface-2/30 dark:disabled:bg-surface-2/80 dark:aria-invalid:border-error-border dark:aria-invalid:ring-error-text/40 dark:placeholder:text-fg-3 dark:focus-visible:border-fg-3 dark:focus-visible:ring-ring-focus/50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
