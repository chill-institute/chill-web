import { useEffect, useRef } from "react";
import { toast, type ExternalToast } from "sonner";

import { useMountEffect } from "@/ui/hooks/use-effects";

type SonnerToastDescriptor = {
  action?: ExternalToast["action"];
  id: string;
  kind: "default" | "loading";
  message: string;
  position?: ExternalToast["position"];
} | null;

export function useSonnerToastDescriptor(descriptor: SonnerToastDescriptor): void {
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!descriptor) {
      if (currentIdRef.current) {
        toast.dismiss(currentIdRef.current);
        currentIdRef.current = null;
      }
      return;
    }

    const sonnerId = `${descriptor.id}:${descriptor.kind}`;

    if (currentIdRef.current && currentIdRef.current !== sonnerId) {
      toast.dismiss(currentIdRef.current);
    }

    currentIdRef.current = sonnerId;

    const options = {
      action: descriptor.action,
      duration: Number.POSITIVE_INFINITY,
      id: sonnerId,
      position: descriptor.position,
    };

    if (descriptor.kind === "loading") {
      toast.loading(descriptor.message, options);
      return;
    }

    toast(descriptor.message, options);
  }, [descriptor]);

  useMountEffect(() => () => {
    if (currentIdRef.current) {
      toast.dismiss(currentIdRef.current);
    }
  });
}
