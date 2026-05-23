import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

import { cn } from "../../../lib/cn";

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-surface-2 text-sm text-fg-2 group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  );
}

export { AvatarFallback };
