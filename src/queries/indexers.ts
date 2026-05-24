import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";
import { indexersQueryOptionsForApi } from "@/queries/options";

export function useIndexersQuery() {
  const api = useApi();
  const auth = useAuth();

  return useQuery({
    ...indexersQueryOptionsForApi(api),
    enabled: auth.isAuthenticated,
  });
}
