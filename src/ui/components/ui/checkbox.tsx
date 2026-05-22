import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";

const checkboxVariants = cva(
  "relative flex shrink-0 cursor-pointer appearance-none items-center justify-center rounded-sm border border-solid border-border-strong bg-surface outline-none select-none after:absolute after:-inset-x-3 after:-inset-y-2 hover-hover:hover:bg-hover hover:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:size-3.5",
  {
    variants: {
      size: {
        default: "size-5 sm:size-4",
        sm: "size-4 after:-inset-x-2 after:-inset-y-2 [&_svg]:size-3",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants>;

export function Checkbox({ className, size, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
