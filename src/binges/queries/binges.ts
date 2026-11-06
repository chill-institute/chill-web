import { create } from "@bufbuild/protobuf";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import {
  type Binge,
  BingeSummarySchema,
  GetBingeResponseSchema,
  type ListBingesResponse,
} from "@chill-institute/contracts/chill/v4/api_pb";
import {
  type QueryClient,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

const MAX_SUMMARY_POSTERS = 3;

function summarize(binge: Binge) {
  return create(BingeSummarySchema, {
    id: binge.id,
    title: binge.title,
    blurb: binge.blurb,
    itemCount: binge.items.length,
    createdAt: binge.createdAt,
    updatedAt: binge.updatedAt,
    curatorName: binge.curatorName,
    posterUrls: binge.items
      .map((item) => item.posterUrl)
      .filter(Boolean)
      .slice(0, MAX_SUMMARY_POSTERS),
  });
}

function withSaved(list: ListBingesResponse, saved: Binge): ListBingesResponse {
  const summary = summarize(saved);
  const known = list.binges.some((entry) => entry.id === saved.id);
  return {
    ...list,
    binges: known
      ? list.binges.map((entry) => (entry.id === saved.id ? summary : entry))
      : [summary, ...list.binges],
    latest: known && list.latest?.id !== saved.id ? list.latest : saved,
  };
}

function withoutBinge(list: ListBingesResponse, id: string): ListBingesResponse {
  return {
    ...list,
    binges: list.binges.filter((entry) => entry.id !== id),
    latest: list.latest?.id === id ? undefined : list.latest,
  };
}

async function patchBinges(
  queryClient: QueryClient,
  patch: (list: ListBingesResponse) => ListBingesResponse,
) {
  await queryClient.cancelQueries({ queryKey: BINGES_QUERY_KEY, exact: true });
  queryClient.setQueryData<ListBingesResponse>(BINGES_QUERY_KEY, (list) =>
    list ? patch(list) : list,
  );
  void queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY, exact: true });
}

export function useSaveBinge() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      expectedUpdatedAt,
    }: {
      id?: string;
      input: BingeInput;
      expectedUpdatedAt?: Timestamp;
    }) => {
      const response = id
        ? await api.updateBinge(id, input, expectedUpdatedAt)
        : await api.createBinge(input);
      return response.binge;
    },
    onSuccess: async (saved) => {
      if (!saved) {
        void queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY, exact: true });
        return;
      }
      await queryClient.cancelQueries({ queryKey: bingeQueryKey(saved.id), exact: true });
      queryClient.setQueryData(
        bingeQueryKey(saved.id),
        create(GetBingeResponseSchema, { binge: saved }),
      );
      await patchBinges(queryClient, (list) => withSaved(list, saved));
    },
  });
}

export function useLoadLatestBinge() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await queryClient.fetchQuery({
        ...bingeQueryOptions(api, id),
        staleTime: 0,
      });
      return response.binge;
    },
    onSuccess: async (latest) => {
      if (latest) await patchBinges(queryClient, (list) => withSaved(list, latest));
    },
  });
}

export function useDeleteBinge() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBinge(id),
    onSuccess: (_response, id) => patchBinges(queryClient, (list) => withoutBinge(list, id)),
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
      void queryClient.invalidateQueries({ queryKey: BINGES_QUERY_KEY, exact: true });
      void queryClient.invalidateQueries({
        queryKey: BINGES_QUERY_KEY,
        predicate: (query) => query.queryKey.length > BINGES_QUERY_KEY.length,
        refetchType: "none",
      });
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
