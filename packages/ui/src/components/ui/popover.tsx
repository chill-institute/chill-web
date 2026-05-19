import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

const Popover = PopoverPrimitive.Root;

const PopoverClose = PopoverPrimitive.Close;

const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverArrow(props: ComponentProps<typeof PopoverPrimitive.Arrow>) {
  return <PopoverPrimitive.Arrow {...props} className="fill-border-strong" />;
}

function PopoverContent({
  align = "center",
  alignOffset = 0,
  portalContainer,
  side = "bottom",
  sideOffset = 0,
  className,
  children,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<
    ComponentProps<typeof PopoverPrimitive.Positioner>,
    "side" | "sideOffset" | "align" | "alignOffset"
  > & {
    portalContainer?: ComponentProps<typeof PopoverPrimitive.Portal>["container"];
  }) {
  return (
    <PopoverPrimitive.Portal container={portalContainer}>
      <PopoverPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="z-[60]"
        style={{ zIndex: 60 }}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "ui-popup border-border-strong bg-surface text-fg-1 shadow-press w-72 rounded border p-4 outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger };
