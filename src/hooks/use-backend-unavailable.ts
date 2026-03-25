import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import {
  getBackendUnavailableError,
  subscribeToBackendUnavailable,
} from "@/lib/backend-unavailable-store";

export function useBackendUnavailable() {
  const queryClient = useQueryClient();
  const error = useSyncExternalStore(subscribeToBackendUnavailable, getBackendUnavailableError);

  return {
    error,
    isBackendUnavailable: error !== null,
    retry: async () => {
      await queryClient.refetchQueries({ type: "active" });
    },
  };
}
