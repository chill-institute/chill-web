import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "../../lib/cn";

const nativeSelectSizes = cva("", {
  variants: {
    size: {
      default: "h-9 py-1.5 pr-8 pl-2.5 text-base sm:text-sm",
      sm: "h-8 min-w-0 py-0 pr-8 pl-2.5 text-sm",
      "sm-dense": "h-8 min-w-0 py-0 pr-6 pl-2 text-sm",
      xs: "h-[1.875rem] py-1 pr-7 pl-2 text-xs",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

type NativeSelectProps = Omit<ComponentProps<"select">, "size"> &
  VariantProps<typeof nativeSelectSizes> & {
    wrapperClassName?: string;
  };

function NativeSelect({
  className,
  wrapperClassName,
  size,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <span
      data-slot="native-select-wrapper"
      className={cn("relative inline-flex w-full items-center", wrapperClassName)}
    >
      <select
        data-slot="native-select"
        className={cn(
          "w-full appearance-none rounded border border-border-control bg-surface text-fg-1 outline-none focus-visible:border-ring-focus focus-visible:ring-3 focus-visible:ring-ring-focus/50 disabled:cursor-not-allowed disabled:bg-surface-2/50 disabled:opacity-50 aria-invalid:border-error-text aria-invalid:ring-3 aria-invalid:ring-error-text/20 dark:bg-surface-2/30 dark:disabled:bg-surface-2/80 dark:aria-invalid:border-error-border dark:aria-invalid:ring-error-text/40 dark:focus-visible:border-fg-3 dark:focus-visible:ring-ring-focus/50",
          nativeSelectSizes({ size }),
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-2 dark:text-fg-3"
      />
    </span>
  );
}

export { NativeSelect };
