import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "@/lib/api";
import { HttpError } from "@/lib/http-error";
import type { GraphsValues } from "@/lib/schemas";
import type { TableApiResponse } from "@/lib/table-types";

import { m } from "@/paraglide/messages.js";

const tableQueries = {
  all: () => ["table"] as const,
  gets: () => [...tableQueries.all(), "get"] as const,
  get: (params: GraphsValues) =>
    queryOptions({
      queryKey: [...tableQueries.gets(), params] as const,
      staleTime: Infinity,
      retry: (_failureCount: number, error: Error) =>
        !(error instanceof HttpError && error.status === 429),
      queryFn: async ({ signal }) => {
        const searchParams = new URLSearchParams({
          num_props: String(params.num_props),
          max_height: String(params.max_height),
          compact: "true",
        });

        const res = await fetch(`${API_URL}/api/v1/state-notation/table?${searchParams}`, {
          credentials: "include",
          signal,
        });

        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
          throw new HttpError(429, m.query_rate_limit({ seconds: String(seconds) }));
        }

        if (!res.ok) {
          const text = await res.text();
          throw new HttpError(
            res.status,
            text || m.query_request_failed_status({ status: String(res.status) }),
          );
        }

        return res.json() as Promise<TableApiResponse>;
      },
    }),
};

export function useTableQuery(params: GraphsValues, enabled: boolean) {
  return useQuery({ ...tableQueries.get(params), enabled });
}
