import { ENGINE_API_KEY, ENGINE_URL } from "./constants";
import { jsonError } from "./json-error";
import type { WideEvent } from "./logging";

type EngineResult = { response: Response; ok: true } | { response: Response; ok: false };

export async function fetchEngine(
  path: string,
  params: URLSearchParams,
  requestId: string,
  wideEvent: WideEvent,
): Promise<EngineResult> {
  let engineRes: Response;
  try {
    engineRes = await fetch(`${ENGINE_URL}/v1/state-notation/${path}?${params}`, {
      headers: {
        "X-API-Key": ENGINE_API_KEY,
        "X-Request-ID": requestId,
      },
    });
  } catch {
    wideEvent.error_message = "Engine unavailable";
    return { response: jsonError(503, "Engine unavailable"), ok: false };
  }

  wideEvent.engine_status = engineRes.status;

  if (!engineRes.ok) {
    wideEvent.error_message = `Engine returned ${engineRes.status}`;
    return {
      response: jsonError(engineRes.status, `Engine returned ${engineRes.status}`),
      ok: false,
    };
  }

  return { response: engineRes, ok: true };
}
