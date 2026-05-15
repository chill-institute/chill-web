import { Clipboard, ClipboardCheck, ClipboardX } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../lib/cn";

type CopyButtonProps = {
  value: string;
  variant?: "stamp" | "icon";
  className?: string;
};

function CopyButton({ value, variant = "stamp", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timeout = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  const icon =
    state === "copied" ? <ClipboardCheck /> : state === "error" ? <ClipboardX /> : <Clipboard />;

  return (
    <button
      type="button"
      data-slot="copy-button"
      className={cn(
        variant === "stamp"
          ? "btn min-w-8 cursor-copy px-2"
          : "text-fg-3 hover-hover:hover:bg-hover hover-hover:hover:text-fg-1 inline-flex size-7 cursor-copy items-center justify-center rounded border border-transparent bg-transparent transition-colors [&_svg]:pointer-events-none [&_svg]:size-3.5",
        className,
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setState("copied");
        } catch {
          setState("error");
        }
      }}
      aria-label={
        state === "copied" ? "Copied link" : state === "error" ? "Failed to copy link" : "Copy link"
      }
      title={state === "copied" ? "copied" : state === "error" ? "failed to copy" : "copy link"}
    >
      <span key={state} className="animate-feedback-in flex items-center justify-center">
        {icon}
      </span>
    </button>
  );
}

export { CopyButton };
