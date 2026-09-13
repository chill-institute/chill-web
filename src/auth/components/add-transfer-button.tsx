import { toast } from "sonner";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { type PropsWithChildren, useRef, useState } from "react";

import type { CatalogOriginInput } from "@/api/api";
import { Button } from "@/ui/components/ui/button";
import { Spinner } from "@/ui/components/ui/spinner";
import { useMountEffect } from "@/ui/hooks/use-effects";

import { useApi } from "../api-context";
import { toErrorMessage } from "../errors";

type Props = PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  catalogOrigin?: CatalogOriginInput;
  url: string;
}>;

type TransferStatus = "idle" | "pending" | "success" | "error";

export function AddTransferButton({
  children = "send to put.io",
  ariaLabel,
  className,
  catalogOrigin,
  url,
}: Props) {
  const api = useApi();
  const [viewInPutio, setViewInPutio] = useState(false);
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [error, setError] = useState<unknown>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMountEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  });

  const iconOnly = typeof children !== "string";
  const phase = viewInPutio ? "view" : status;
  const { icon, text } = (() => {
    if (viewInPutio)
      return { icon: <ExternalLink className="text-success" />, text: "see in put.io" };
    if (status === "pending") return { icon: <Spinner />, text: "sending" };
    if (status === "success")
      return { icon: <CheckCircle2 className="text-success" />, text: "sent!" };
    if (status === "error") return { icon: <XCircle className="text-error" />, text: "failed" };
    return { icon: null, text: children };
  })();
  const accessibleLabel =
    status === "error"
      ? toErrorMessage(error)
      : typeof text === "string"
        ? text
        : (ariaLabel ?? "send to put.io");

  async function sendOrOpenTransfer() {
    if (viewInPutio) {
      window.open("https://put.io/transfers", "_blank", "noopener,noreferrer");
      return;
    }
    if (status !== "idle") {
      return;
    }
    setStatus("pending");
    setError(null);
    try {
      await api.addTransfer(url, catalogOrigin);
      setStatus("success");
      successTimerRef.current = setTimeout(() => setViewInPutio(true), 1000);
    } catch (transferError) {
      setError(transferError);
      toast.error(toErrorMessage(transferError));
      setStatus("error");
      errorTimerRef.current = setTimeout(() => {
        setStatus("idle");
        setError(null);
      }, 3000);
    }
  }

  return (
    <Button
      type="button"
      className={className}
      disabled={status === "pending"}
      focusableWhenDisabled={status === "pending"}
      onClick={sendOrOpenTransfer}
      aria-label={accessibleLabel}
      aria-live="polite"
    >
      <span className="grid items-center justify-items-center">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">
          {children}
        </span>
        {!iconOnly ? (
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 flex items-center gap-1"
          >
            <ExternalLink />
            see in put.io
          </span>
        ) : null}
        <span
          key={phase}
          className="animate-feedback-in col-start-1 row-start-1 flex items-center gap-1"
        >
          {icon ? <span data-icon="inline-start">{icon}</span> : null}
          {!iconOnly || !icon ? <span>{text}</span> : null}
        </span>
      </span>
    </Button>
  );
}
