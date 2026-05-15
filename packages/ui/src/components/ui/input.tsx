import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "../../lib/cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded border border-border-strong bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg-1 placeholder:text-fg-2 focus-visible:border-ring-focus focus-visible:ring-3 focus-visible:ring-ring-focus/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2/50 disabled:opacity-50 aria-invalid:border-error-text aria-invalid:ring-3 aria-invalid:ring-error-text/20 md:text-sm dark:bg-surface-2/30 dark:disabled:bg-surface-2/80 dark:aria-invalid:border-error-border dark:aria-invalid:ring-error-text/40 dark:file:text-surface dark:placeholder:text-fg-3 dark:focus-visible:border-fg-3 dark:focus-visible:ring-ring-focus/50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
