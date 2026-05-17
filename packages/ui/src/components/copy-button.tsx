import { Clipboard, ClipboardCheck, ClipboardX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/cn";
import { Button } from "./ui/button";

type CopyButtonProps = {
  value: string;
  variant?: "stamp" | "icon";
  className?: string;
};

function CopyButton({ value, variant = "stamp", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const scheduleReset = () => {
    if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setState("idle"), 2000);
  };

  const icon =
    state === "copied" ? <ClipboardCheck /> : state === "error" ? <ClipboardX /> : <Clipboard />;

  return (
    <Button
      type="button"
      data-slot="copy-button"
      variant={variant === "stamp" ? "default" : "ghost"}
      size={variant === "stamp" ? "default" : "icon-sm"}
      className={cn(
        "cursor-copy",
        variant === "stamp" ? "min-w-8 px-2" : "[&_svg]:size-3.5",
        className,
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setState("copied");
        } catch {
          setState("error");
        }
        scheduleReset();
      }}
      aria-label={
        state === "copied" ? "Copied link" : state === "error" ? "Failed to copy link" : "Copy link"
      }
      title={state === "copied" ? "copied" : state === "error" ? "failed to copy" : "copy link"}
    >
      <span key={state} className="animate-feedback-in flex items-center justify-center">
        {icon}
      </span>
    </Button>
  );
}

export { CopyButton };
