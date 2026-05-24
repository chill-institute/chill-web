import type { ElementType, ReactNode } from "react";

import { FullscreenCenter } from "./fullscreen-center";
import { cn } from "../lib/cn";

type StatusPanelProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

function StatusPanel({ children, className, as: Root = "main" }: StatusPanelProps) {
  return (
    <FullscreenCenter as={Root} contentClassName="max-w-3xl">
      <div
        data-slot="status-panel"
        className={cn(
          "border-border-soft bg-surface flex w-full flex-col gap-6 rounded-xl border p-6 shadow-sm",
          className,
        )}
      >
        {children}
      </div>
    </FullscreenCenter>
  );
}

export { StatusPanel };
