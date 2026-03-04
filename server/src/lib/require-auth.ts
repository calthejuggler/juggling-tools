import { auth } from "./auth";
import { jsonError } from "./json-error";
import type { WideEvent } from "./logging";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type SessionResult = { ok: true; session: Session } | { ok: false; response: Response };

export async function requireSession(
  request: Request,
  wideEvent: WideEvent,
): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    wideEvent.error_message = "Unauthorized";
    return { ok: false, response: jsonError(401, "Unauthorized") };
  }

  wideEvent.user_id = session.user.id;
  wideEvent.user_role = session.user.role ?? undefined;

  return { ok: true, session };
}
