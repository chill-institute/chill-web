import { useQuery } from "@tanstack/react-query";

import { useApi } from "../api-context";
import { useAuth } from "../auth";
import { userProfileQueryOptions } from "./options";

export function useProfileQuery() {
  const api = useApi();
  const { authToken } = useAuth();
  return useQuery(userProfileQueryOptions(api, authToken));
}
