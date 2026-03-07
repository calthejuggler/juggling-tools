import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "@/lib/api";

import { m } from "@/paraglide/messages.js";

const configQueries = {
  all: () => ["config"] as const,
  gets: () => [...configQueries.all(), "get"] as const,
  get: () =>
    queryOptions({
      queryKey: [...configQueries.gets()] as const,
      staleTime: Infinity,
      queryFn: async ({ signal }) => {
        const res = await fetch(`${API_URL}/api/v1/config`, {
          credentials: "include",
          signal,
        });
        if (!res.ok) throw new Error(m.query_fetch_config_failed());
        return res.json() as Promise<{ max_max_height: number }>;
      },
    }),
};

export function useConfigQuery() {
  return useQuery(configQueries.get());
}
