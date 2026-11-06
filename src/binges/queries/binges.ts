import { create } from "@bufbuild/protobuf";
import {
  GetBingeResponseSchema,
  type ListBingesResponse,
} from "@chill-institute/contracts/chill/v4/api_pb";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BingeInput } from "@/api/api";
import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";

import {
  BINGES_QUERY_KEY,
  BINGE_TITLE_SEARCH_MIN_LENGTH,
  bingeQueryKey,
  bingeQueryOptions,
  bingeTitleSearchQueryOptions,
  bingesQueryOptions,
  normalizeBingeTitleQuery,
} from "./options";

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
    onSuccess: (saved) => {
      if (saved) {
        queryClient.setQueryData(
          bingeQueryKey(saved.id),
          create(GetBingeResponseSchema, { binge: saved }),
        );
        queryClient.setQueryData<ListBingesResponse>(BINGES_QUERY_KEY, (list) =>
          list?.latest?.id === saved.id ? { ...list, latest: saved } : list,
        );
      }
      void queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY, exact: true });
    },
  });
}

export function useDeleteBinge() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBinge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY, exact: true }),
  });
}

export function useForgetBinge() {
  const queryClient = useQueryClient();
  return (id: string) => queryClient.removeQueries({ queryKey: bingeQueryKey(id), exact: true });
}

export function useSetCuratorName() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) =>
      (await api.setBingeCuratorName(displayName)).displayName,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY });
    },
  });
}

export function useBingeTitleSearch(query: string) {
  const api = useApi();
  const auth = useAuth();
  return useQuery({
    ...bingeTitleSearchQueryOptions(api, query, auth.isAuthenticated),
    placeholderData: keepPreviousData,
  });
}

export function useFindBingeTitles() {
  const api = useApi();
  const queryClient = useQueryClient();
  return async (query: string) => {
    if (normalizeBingeTitleQuery(query).length < BINGE_TITLE_SEARCH_MIN_LENGTH) return [];
    const response = await queryClient.fetchQuery(bingeTitleSearchQueryOptions(api, query));
    return response.matches;
  };
}
