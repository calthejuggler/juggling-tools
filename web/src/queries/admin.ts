import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import type { AdminSearchValues, BanUserValues } from "@/lib/admin-schemas";
import { API_URL } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

import { m } from "@/paraglide/messages.js";

export const ADMIN_PAGE_SIZE = 20;

export async function fetchBanInfo(
  email: string,
): Promise<{ reason: string | null; expires: string | null } | null> {
  const res = await fetch(`${API_URL}/api/v1/admin/ban-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.banned ? { reason: data.banReason, expires: data.banExpires } : null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  role: "admin" | "user" | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  lastLoginAt: string | null;
}

export const adminQueries = {
  all: () => ["admin"] as const,
  users: () => [...adminQueries.all(), "users"] as const,
  userList: (params: AdminSearchValues) =>
    queryOptions({
      queryKey: [...adminQueries.users(), params] as const,
      queryFn: async () => {
        const searchParams = new URLSearchParams({
          limit: String(ADMIN_PAGE_SIZE),
          offset: String((params.page - 1) * ADMIN_PAGE_SIZE),
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
        });

        if (params.search) {
          searchParams.set("search", params.search);
        }

        const res = await fetch(`${API_URL}/api/v1/admin/users?${searchParams}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(m.admin_failed_list_users());
        return res.json() as Promise<{ users: AdminUser[]; total: number }>;
      },
    }),
  sessions: (userId: string) => [...adminQueries.all(), "sessions", userId] as const,
  userSessions: (userId: string) =>
    queryOptions({
      queryKey: adminQueries.sessions(userId),
      queryFn: async () => {
        const res = await authClient.admin.listUserSessions({ userId });
        if (res.error) throw new Error(res.error.message ?? m.admin_failed_list_sessions());
        return res.data;
      },
    }),
};

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminQueries.users() });
}

export function useBanUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ userId, ...values }: BanUserValues & { userId: string }) => {
      const res = await authClient.admin.banUser({ userId, ...values });
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_ban_user());
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useUnbanUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.unbanUser({ userId });
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_unban_user());
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useSetRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      const res = await authClient.admin.setRole({ userId, role });
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_set_role());
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useImpersonateUser() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.impersonateUser({ userId });
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_impersonate());
      return res.data;
    },
    onSuccess: () => {
      window.location.assign("/");
    },
  });
}

export function useStopImpersonating() {
  return useMutation({
    mutationFn: async () => {
      const res = await authClient.admin.stopImpersonating();
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_stop_impersonating());
      return res.data;
    },
    onSuccess: () => {
      window.location.assign("/admin");
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionToken, userId }: { sessionToken: string; userId: string }) => {
      const res = await authClient.admin.revokeUserSession({ sessionToken });
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_revoke_session());
      return { ...res.data, userId };
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminQueries.sessions(userId) });
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.revokeUserSessions({ userId });
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_revoke_sessions());
      return res.data;
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: adminQueries.sessions(userId) });
    },
  });
}

export function useRemoveUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.removeUser({ userId });
      if (res.error) throw new Error(res.error.message ?? m.admin_failed_remove_user());
      return res.data;
    },
    onSuccess: invalidate,
  });
}
