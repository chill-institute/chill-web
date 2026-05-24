import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";

type FullscreenCenterProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  as?: ElementType;
};

function FullscreenCenter({
  children,
  className,
  contentClassName,
  as: Root = "main",
}: FullscreenCenterProps) {
  return (
    <Root className={cn("flex min-h-dvh items-center justify-center px-4 py-8 md:px-8", className)}>
      <div
        data-slot="fullscreen-center"
        className={cn("w-full -translate-y-[4vh]", contentClassName)}
      >
        {children}
      </div>
    </Root>
  );
}

export { FullscreenCenter };
