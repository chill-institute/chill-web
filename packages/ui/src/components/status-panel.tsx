import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";

type StatusPanelProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

function StatusPanel({ children, className, as: Root = "main" }: StatusPanelProps) {
  return (
    <Root className="min-h-dvh px-4 py-8 md:py-12">
      <div
        data-slot="status-panel"
        className={cn(
          "border-border-soft bg-surface-2 mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-xl border p-6 shadow-sm",
          className,
        )}
      >
        {children}
      </div>
    </Root>
  );
}

export { StatusPanel };
