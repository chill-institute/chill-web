import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/cn";
import { slotAttr } from "../../lib/slot-attr";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring-focus focus-visible:ring-[3px] focus-visible:ring-ring-focus/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-error-text aria-invalid:ring-error-text/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-fg-1 text-surface [a&]:hover:bg-fg-1/80",
        secondary: "bg-surface-2 text-fg-1 [a&]:hover:bg-surface-2/80",
        destructive: "bg-error-bg text-error-text [a&]:hover:bg-error-bg/80",
        outline: "border-border-strong text-fg-1 [a&]:hover:bg-surface-2 [a&]:hover:text-fg-1",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg-1",
        link: "text-fg-1 underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        ...slotAttr("badge"),
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
