import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BingeInput } from "@/api/api";
import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";

import { BINGES_QUERY_KEY, bingeQueryOptions, bingesQueryOptions } from "./options";

export function useBingesQuery() {
  const api = useApi();
  const auth = useAuth();
  return useQuery(bingesQueryOptions(api, auth.isAuthenticated));
}

export function useBingeQuery(id: string | undefined) {
  const api = useApi();
  const auth = useAuth();
  return useQuery(bingeQueryOptions(api, id ?? "", auth.isAuthenticated && id !== undefined));
}

export function useSaveBinge() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: BingeInput }) => {
      const response = id ? await api.updateBinge(id, input) : await api.createBinge(input);
      return response.binge;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY }),
  });
}

export function useDeleteBinge() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBinge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY }),
  });
}
