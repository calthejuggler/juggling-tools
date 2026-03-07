import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "@/lib/api";
import { HttpError } from "@/lib/http-error";
import type { ThrowsApiResponse } from "@/lib/throws-types";

import { m } from "@/paraglide/messages.js";

interface ThrowsParams {
  state: number;
  max_height: number;
}

const throwsQueries = {
  all: () => ["throws"] as const,
  gets: () => [...throwsQueries.all(), "get"] as const,
  get: (params: ThrowsParams) =>
    queryOptions({
      queryKey: [...throwsQueries.gets(), params] as const,
      staleTime: Infinity,
      retry: (_failureCount: number, error: Error) =>
        !(error instanceof HttpError && error.status === 429),
      queryFn: async ({ signal }) => {
        const searchParams = new URLSearchParams({
          state: String(params.state),
          max_height: String(params.max_height),
          compact: "true",
        });

        const res = await fetch(`${API_URL}/api/v1/state-notation/throws?${searchParams}`, {
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

        return res.json() as Promise<ThrowsApiResponse>;
      },
    }),
};

export function useThrowsQuery(params: ThrowsParams, enabled = true) {
  return useQuery({ ...throwsQueries.get(params), enabled });
}
