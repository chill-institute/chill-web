import { Clipboard, ClipboardCheck, ClipboardX } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "../lib/cn";
import { useMountEffect } from "../hooks/use-effects";
import { Button } from "./ui/button";

type CopyButtonProps = {
  value: string;
  variant?: "stamp" | "icon";
  className?: string;
};

async function copyText(value: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall back to execCommand below (e.g. non-secure context)
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function CopyButton({ value, variant = "stamp", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMountEffect(() => () => {
    if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
  });

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
      className={cn(variant === "stamp" && "min-w-8 px-2", className)}
      onClick={async () => {
        setState((await copyText(value)) ? "copied" : "error");
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
