import type { ComponentProps } from "react";
import { X } from "lucide-react";

import { cn } from "../lib/cn";
import { IconButton } from "./icon-button";

type ModalCloseButtonProps = Omit<ComponentProps<typeof IconButton>, "children">;

function ModalCloseButton({ className, ...props }: ModalCloseButtonProps) {
  return (
    <IconButton
      className={cn(
        "border-border-soft z-20 rounded-full bg-surface/80 text-fg-1 backdrop-blur-sm hover-hover:hover:bg-surface",
        className,
      )}
      {...props}
    >
      <X />
    </IconButton>
  );
}

export { ModalCloseButton };
