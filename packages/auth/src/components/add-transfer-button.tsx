import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { type PropsWithChildren, useEffect, useRef, useState } from "react";

import { Button } from "@chill-institute/ui/components/ui/button";
import { Spinner } from "@chill-institute/ui/components/ui/spinner";

import { useApi } from "../api-context";
import { toErrorMessage } from "../errors";

type Props = PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  url: string;
}>;

type TransferStatus = "idle" | "pending" | "success" | "error";

export function AddTransferButton({
  children = "send to put.io",
  ariaLabel,
  className,
  url,
}: Props) {
  const api = useApi();
  const [viewInPutio, setViewInPutio] = useState(false);
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [error, setError] = useState<unknown>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    },
    [],
  );

  const phase = viewInPutio ? "view" : status;
  const { icon, text } = (() => {
    if (viewInPutio)
      return { icon: <ExternalLink className="text-success" />, text: "see in put.io" };
    if (status === "pending") return { icon: <Spinner />, text: "sending" };
    if (status === "success")
      return { icon: <CheckCircle2 className="text-success" />, text: "sent!" };
    if (status === "error")
      return { icon: <XCircle className="text-error" />, text: toErrorMessage(error) };
    return { icon: null, text: children };
  })();
  const accessibleLabel = typeof text === "string" ? text : (ariaLabel ?? "send to put.io");

  async function sendOrOpenTransfer() {
    if (viewInPutio) {
      window.open("https://put.io/transfers", "_blank");
      return;
    }
    if (status !== "idle") {
      return;
    }
    setStatus("pending");
    setError(null);
    try {
      await api.addTransfer(url);
      setStatus("success");
      successTimerRef.current = setTimeout(() => setViewInPutio(true), 1000);
    } catch (transferError) {
      setError(transferError);
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
      onClick={sendOrOpenTransfer}
      aria-label={accessibleLabel}
      aria-live="polite"
    >
      <span key={phase} className="animate-feedback-in flex items-center gap-1">
        {icon ? <span data-icon="inline-start">{icon}</span> : null}
        <span>{text}</span>
      </span>
    </Button>
  );
}
