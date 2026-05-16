import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded border border-transparent bg-clip-padding text-sm leading-[1] whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app disabled:cursor-not-allowed disabled:opacity-70 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-border-strong bg-surface text-fg-1 shadow-press hover-hover:hover:bg-hover active:translate-x-px active:translate-y-px active:shadow-none active:duration-100",
        primary:
          "border-border-strong bg-fg-1 text-fg-inverse shadow-press hover-hover:hover:bg-fg-2 active:translate-x-px active:translate-y-px active:shadow-none active:duration-100",
        ghost:
          "text-fg-2 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 active:scale-[0.97] active:duration-100",
        outline: "border-border-strong bg-transparent text-fg-1 hover-hover:hover:bg-hover",
        done: "border-border-soft bg-transparent text-success cursor-default",
        off: "border-border-soft bg-transparent text-fg-3 cursor-not-allowed",
        link: "text-fg-1 underline-offset-4 hover-hover:hover:underline",
      },
      size: {
        default: "px-2 py-1.5 [min-height:var(--control-h)]",
        sm: "px-2 text-xs [min-height:var(--control-h-sm)]",
        hero: "px-3.5 py-1.5 text-[0.9375rem] [min-height:var(--control-h-md)]",
        icon: "size-8 px-0",
        "icon-sm": "size-7 px-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const PRESS_TRANSITION =
  "motion-safe:transition-[transform,background-color,border-color,color,box-shadow] motion-safe:duration-fast motion-safe:ease-out";

function Button({
  className,
  variant = "default",
  size = "default",
  type,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const buttonType = props.render ? type : (type ?? "button");

  return (
    <ButtonPrimitive
      type={buttonType}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), PRESS_TRANSITION, className)}
      {...props}
    />
  );
}

export { Button };
