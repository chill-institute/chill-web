import { Clipboard, ClipboardCheck, ClipboardX, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "../lib/cn";
import { useMountEffect } from "../hooks/use-effects";
import { Button } from "./ui/button";

type CopyButtonProps = {
  value: string;
  // Resolves the text to copy from value at click time; value is copied as is
  // when it is absent.
  resolveValue?: (value: string) => Promise<string>;
  variant?: "stamp" | "icon";
  className?: string;
};

async function writePendingText(value: Promise<string>): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) return false;
  try {
    // Safari drops the click's permission across an await; a pending
    // ClipboardItem keeps it while the value resolves.
    const blob = value.then((text) => new Blob([text], { type: "text/plain" }));
    await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    return true;
  } catch {
    return false;
  }
}

async function copyText(value: string | Promise<string>): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      if (typeof value !== "string" && (await writePendingText(value))) return true;
      await navigator.clipboard.writeText(await value);
      return true;
    }
  } catch {
    // fall back to execCommand below (e.g. non-secure context)
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = await value;
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

function CopyButton({ value, resolveValue, variant = "stamp", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "pending" | "copied" | "error">("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMountEffect(() => () => {
    if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
  });

  const scheduleReset = () => {
    if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setState("idle"), 2000);
  };

  const icon =
    state === "pending" ? (
      <Loader2 className="motion-safe:animate-spin" />
    ) : state === "copied" ? (
      <ClipboardCheck />
    ) : state === "error" ? (
      <ClipboardX />
    ) : (
      <Clipboard />
    );

  return (
    <Button
      type="button"
      data-slot="copy-button"
      variant={variant === "stamp" ? "default" : "ghost"}
      size={variant === "stamp" ? "default" : "icon-sm"}
      className={cn(variant === "stamp" && "min-w-8 px-2", className)}
      disabled={state === "pending"}
      onClick={async () => {
        if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
        if (resolveValue) setState("pending");
        setState((await copyText(resolveValue ? resolveValue(value) : value)) ? "copied" : "error");
        scheduleReset();
      }}
      aria-label={
        state === "pending"
          ? "Copying link"
          : state === "copied"
            ? "Copied link"
            : state === "error"
              ? "Failed to copy link"
              : "Copy link"
      }
      title={
        state === "pending"
          ? "copying"
          : state === "copied"
            ? "copied"
            : state === "error"
              ? "failed to copy"
              : "copy link"
      }
    >
      <span key={state} className="animate-feedback-in flex items-center justify-center">
        {icon}
      </span>
    </Button>
  );
}

export { CopyButton };
