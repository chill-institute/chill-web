import { cva } from "class-variance-authority";

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-border-soft bg-surface text-fg-1",
        destructive: "border-error-border bg-surface text-error-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export { alertVariants };
