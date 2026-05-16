import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

type CheckboxFieldProps = ComponentProps<typeof Checkbox> & {
  id: string;
  children: ReactNode;
  fieldClassName?: string;
  labelClassName?: string;
};

export function CheckboxField({
  id,
  children,
  className,
  fieldClassName,
  labelClassName,
  size,
  ...props
}: CheckboxFieldProps) {
  return (
    <div className={cn("flex items-center gap-1.5", fieldClassName)}>
      <Checkbox id={id} size={size} className={className} {...props} />
      <Label htmlFor={id} className={cn("text-sm font-normal", labelClassName)}>
        {children}
      </Label>
    </div>
  );
}
