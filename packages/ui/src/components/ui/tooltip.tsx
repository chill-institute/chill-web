import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider closeDelay={0} delay={500} timeout={450}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<
    ComponentProps<typeof TooltipPrimitive.Positioner>,
    "side" | "sideOffset" | "align" | "alignOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "ui-tooltip border-border-strong bg-surface text-fg-1 shadow-press z-50 overflow-hidden rounded border px-2 py-1 text-sm",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
