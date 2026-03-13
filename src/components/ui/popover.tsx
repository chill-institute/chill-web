import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const Popover = PopoverPrimitive.Root;

const PopoverClose = PopoverPrimitive.Close;

const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverArrow(props: ComponentProps<typeof PopoverPrimitive.Arrow>) {
  return <PopoverPrimitive.Arrow {...props} className="fill-stone-950 dark:fill-stone-700" />;
}

function PopoverContent({
  align = "center",
  className,
  sideOffset = 0,
  children,
  ...props
}: { align?: "start" | "center" | "end"; sideOffset?: number } & ComponentProps<
  typeof PopoverPrimitive.Popup
>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side="bottom" align={align} sideOffset={sideOffset}>
        <PopoverPrimitive.Popup
          className={cn(
            "z-50 w-72 rounded-md border border-stone-950 bg-stone-100 p-4 text-stone-950 shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50",
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
