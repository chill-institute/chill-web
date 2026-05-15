import { createContext, use, useMemo, type ReactNode } from "react";
import type { ChillApi } from "@chill-institute/api";

type ApiContextValue = {
  api: ChillApi;
  getPutioStartURL: (successURL?: string) => string;
};

const ApiContext = createContext<ApiContextValue | null>(null);

type ApiProviderProps = {
  api: ChillApi;
  getPutioStartURL: (successURL?: string) => string;
  children: ReactNode;
};

export function ApiProvider({ api, getPutioStartURL, children }: ApiProviderProps) {
  const value = useMemo<ApiContextValue>(
    () => ({ api, getPutioStartURL }),
    [api, getPutioStartURL],
  );
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ChillApi {
  const ctx = use(ApiContext);
  if (!ctx) throw new Error("useApi must be used within ApiProvider");
  return ctx.api;
}

export function useGetPutioStartURL(): (successURL?: string) => string {
  const ctx = use(ApiContext);
  if (!ctx) throw new Error("useGetPutioStartURL must be used within ApiProvider");
  return ctx.getPutioStartURL;
}
