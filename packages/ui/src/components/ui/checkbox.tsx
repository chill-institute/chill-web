import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

type Props = {
  id: string;
  label: string;
  variant?: "default" | "small";
} & ComponentProps<typeof CheckboxPrimitive.Root>;

export function Checkbox({ id, label, variant = "default", ...props }: Props) {
  return (
    <div className={cn("flex items-end gap-x-1.5", variant === "small" ? "text-sm gap-x-1" : "")}>
      <CheckboxPrimitive.Root
        className={cn(
          "flex h-3.5 w-3.5 cursor-pointer appearance-none items-center justify-center rounded-sm outline-none",
          "select-none",
          "border border-solid border-border-strong",
          "bg-surface",
          "hover-hover:hover:bg-hover hover:transition-colors",
          variant === "small" ? "h-3 w-3" : "",
        )}
        id={id}
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      <label className="leading-none select-none cursor-pointer" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
