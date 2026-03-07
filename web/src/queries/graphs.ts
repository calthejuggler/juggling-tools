import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "@/lib/api";
import type { GraphApiResponse } from "@/lib/graph-types";
import { HttpError } from "@/lib/http-error";
import type { GraphsValues } from "@/lib/schemas";

import { m } from "@/paraglide/messages.js";

const graphQueries = {
  all: () => ["graphs"] as const,
  gets: () => [...graphQueries.all(), "get"] as const,
  get: (params: GraphsValues) =>
    queryOptions({
      queryKey: [...graphQueries.gets(), params] as const,
      staleTime: Infinity,
      retry: (_failureCount: number, error: Error) => {
        if (error instanceof HttpError) {
          // Only retry server errors (5xx), not client errors (4xx)
          return error.status >= 500;
        }
        return true;
      },
      queryFn: async ({ signal }) => {
        const searchParams = new URLSearchParams({
          num_props: String(params.num_props),
          max_height: String(params.max_height),
          compact: "true",
        });

        const res = await fetch(`${API_URL}/api/v1/state-notation/graph?${searchParams}`, {
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
          let message = text || m.query_request_failed_status({ status: String(res.status) });
          try {
            const json = JSON.parse(text);
            if (json.error) message = json.error;
          } catch {
            // JSON parse failed; keep original text as message
          }
          throw new HttpError(res.status, message);
        }

        return res.json() as Promise<GraphApiResponse>;
      },
    }),
};

export function useGraphQuery(params: GraphsValues, enabled = true) {
  return useQuery({ ...graphQueries.get(params), enabled });
}
