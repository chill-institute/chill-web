import { toast } from "sonner";

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

const pwaUpdateToastId = "pwa-update";

function showPwaUpdateToast(updateServiceWorker: UpdateServiceWorker) {
  toast("new version available", {
    action: {
      label: "reload",
      onClick: () => void updateServiceWorker(true),
    },
    cancel: {
      label: "later",
      onClick: () => toast.dismiss(pwaUpdateToastId),
    },
    duration: Number.POSITIVE_INFINITY,
    id: pwaUpdateToastId,
  });
}

export { showPwaUpdateToast };
