import type { ComponentPropsWithoutRef } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "../lib/cn";

type IconButtonProps = ComponentPropsWithoutRef<typeof ButtonPrimitive>;

function IconButton({ className, ...props }: IconButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="icon-button"
      className={cn(
        "text-fg-2 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 motion-safe:ease-out motion-safe:duration-fast inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded border border-transparent bg-transparent motion-safe:transition-[color,background-color,transform] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { IconButton };
