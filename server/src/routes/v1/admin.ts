import { asc, count, desc, eq, ilike, max, or } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { db } from "../../db";
import { sessions, users } from "../../db/schema/auth";
import { auth } from "../../lib/auth";

const SORT_FIELDS = ["name", "email", "createdAt", "role", "banned", "lastLoginAt"] as const;
type SortField = (typeof SORT_FIELDS)[number];

export const adminRoutes = new Elysia({ prefix: "/admin" }).get(
  "/users",
  async ({ query, request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    if (session.user.role !== "admin") {
      set.status = 403;
      return { error: "Forbidden" };
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const searchPattern = query.search ? `%${query.search}%` : undefined;
    const where = searchPattern
      ? or(ilike(users.email, searchPattern), ilike(users.name, searchPattern))
      : undefined;

    const sortByField = (query.sortBy ?? "createdAt") as SortField;
    const sortFn = query.sortDirection === "asc" ? asc : desc;

    const lastLoginSub = db
      .select({ userId: sessions.userId, lastLoginAt: max(sessions.createdAt).as("last_login_at") })
      .from(sessions)
      .groupBy(sessions.userId)
      .as("last_logins");

    const sortColumns: Record<SortField, ReturnType<typeof asc>> = {
      name: sortFn(users.name),
      email: sortFn(users.email),
      createdAt: sortFn(users.createdAt),
      role: sortFn(users.role),
      banned: sortFn(users.banned),
      lastLoginAt: sortFn(lastLoginSub.lastLoginAt),
    };
    const orderBy = sortColumns[sortByField];

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          createdAt: users.createdAt,
          role: users.role,
          banned: users.banned,
          banReason: users.banReason,
          banExpires: users.banExpires,
          lastLoginAt: lastLoginSub.lastLoginAt,
        })
        .from(users)
        .leftJoin(lastLoginSub, eq(users.id, lastLoginSub.userId))
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ]);

    return { users: rows, total: countResult[0]?.total ?? 0 };
  },
  {
    query: t.Object({
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      offset: t.Optional(t.Numeric({ minimum: 0 })),
      search: t.Optional(t.String()),
      sortBy: t.Optional(
        t.Union(
          SORT_FIELDS.map((f) => t.Literal(f)) as [
            ReturnType<typeof t.Literal>,
            ...ReturnType<typeof t.Literal>[],
          ],
        ),
      ),
      sortDirection: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
    }),
  },
);
