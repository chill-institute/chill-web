import type { ComponentProps, ReactNode } from "react";

import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

type CheckboxFieldProps = ComponentProps<typeof Checkbox> & {
  id: string;
  children: ReactNode;
  labelClassName?: string;
};

export function CheckboxField({
  id,
  children,
  className,
  labelClassName,
  size,
  ...props
}: CheckboxFieldProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Checkbox id={id} size={size} className={className} {...props} />
      <Label
        htmlFor={id}
        className={["font-normal text-sm", labelClassName].filter(Boolean).join(" ")}
      >
        {children}
      </Label>
    </div>
  );
}
