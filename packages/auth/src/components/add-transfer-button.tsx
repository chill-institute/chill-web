import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { type PropsWithChildren, useState } from "react";

import { Button } from "@chill-institute/ui/components/ui/button";
import { Spinner } from "@chill-institute/ui/components/ui/spinner";

import { useApi } from "../api-context";
import { toErrorMessage } from "../errors";

type Props = PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  url: string;
}>;

export function AddTransferButton({
  children = "send to put.io",
  ariaLabel,
  className,
  url,
}: Props) {
  const api = useApi();
  const [viewInPutio, setViewInPutio] = useState(false);

  // eslint-disable-next-line react-doctor/query-mutation-missing-invalidation -- fire-and-forget into put.io, no local cache to refresh
  const mutation = useMutation({
    mutationFn: () => api.addTransfer(url),
    onSuccess: () => {
      setTimeout(() => setViewInPutio(true), 1000);
    },
    onError: () => {
      setTimeout(() => mutation.reset(), 3000);
    },
  });

  const phase = viewInPutio ? "view" : mutation.status;
  const { icon, text } = (() => {
    if (viewInPutio)
      return { icon: <ExternalLink className="text-success" />, text: "see in put.io" };
    if (mutation.isPending) return { icon: <Spinner />, text: "sending" };
    if (mutation.isSuccess)
      return { icon: <CheckCircle2 className="text-success" />, text: "sent!" };
    if (mutation.isError)
      return { icon: <XCircle className="text-error" />, text: toErrorMessage(mutation.error) };
    return { icon: null, text: children };
  })();
  const accessibleLabel = typeof text === "string" ? text : (ariaLabel ?? "send to put.io");

  function sendOrOpenTransfer() {
    if (viewInPutio) {
      window.open("https://put.io/transfers", "_blank");
      return;
    }
    if (mutation.isIdle) {
      mutation.mutate();
    }
  }

  return (
    <Button
      type="button"
      className={className}
      disabled={mutation.isPending}
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
