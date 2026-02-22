import { useQuery } from "@tanstack/react-query";
import type { GraphsValues } from "@/lib/schemas";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useGraphs(params: GraphsValues | null) {
  return useQuery({
    queryKey: ["graphs", params],
    enabled: params !== null,
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        num_props: String(params!.num_props),
        max_height: String(params!.max_height),
        compact: String(params!.compact),
      });

      const res = await fetch(`${API_URL}/api/v1/graphs?${searchParams}`, {
        credentials: "include",
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
        throw new Error(
          `Too many requests. Please try again in ${seconds} seconds.`,
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      return res.json();
    },
  });
}
