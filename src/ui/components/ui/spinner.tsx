import { Loader2Icon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";

function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 motion-safe:animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
