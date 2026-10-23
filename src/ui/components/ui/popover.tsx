import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

const popoverContentVariants = cva(
  "ui-popup border-border-strong bg-surface text-fg-1 w-72 rounded border outline-none",
  {
    variants: {
      size: {
        default: "p-4",
        sm: "px-3 py-2",
        flush: "overflow-hidden p-0",
      },
      elevation: {
        default: "shadow-press",
        raised: "shadow-popover",
      },
    },
    defaultVariants: {
      size: "default",
      elevation: "default",
    },
  },
);

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
  size,
  elevation,
  className,
  children,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Popup> &
  VariantProps<typeof popoverContentVariants> &
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
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(popoverContentVariants({ size, elevation }), className)}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger };
