import type { ElementType, ReactNode } from "react";

import { FullscreenCenter } from "./fullscreen-center";
import { cn } from "../lib/cn";

type StatusPanelProps = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  tone?: "neutral" | "error";
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  as?: ElementType;
};

const toneClassName = {
  neutral: "border-border-strong bg-surface-2 text-fg-2",
  error: "border-error-border bg-error-bg text-error-text",
} as const;

function StatusPanel({
  icon,
  title,
  description,
  tone = "neutral",
  children,
  className,
  contentClassName = "max-w-[480px]",
  as: Root = "main",
}: StatusPanelProps) {
  return (
    <FullscreenCenter as={Root} contentClassName={contentClassName}>
      <div
        data-slot="status-panel"
        className={cn(
          "border-border-strong bg-surface shadow-press w-full overflow-hidden rounded-xl border",
          className,
        )}
      >
        <div className="border-border-strong flex flex-col items-center gap-5 border-b px-7 py-6 text-center sm:gap-6">
          <div
            aria-hidden="true"
            className={cn(
              "flex size-16 items-center justify-center rounded-full border [&_svg]:size-7 sm:size-20 sm:[&_svg]:size-8",
              toneClassName[tone],
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 w-full">
            <h1 className="m-0 text-[1.625rem] leading-none sm:text-4xl">{title}</h1>
            {description ? (
              <p className="text-fg-3 mx-auto mt-2 max-w-prose text-sm leading-[1.25]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {children ? <div className="flex flex-col gap-4 px-7 py-6">{children}</div> : null}
      </div>
    </FullscreenCenter>
  );
}

export { StatusPanel };
