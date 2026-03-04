import { z } from "zod";

export const adminSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  page: z.number().int().min(1).catch(1),
  sortBy: z
    .enum(["name", "email", "createdAt", "role", "banned", "lastLoginAt"])
    .catch("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).catch("desc"),
});

export type AdminSearchValues = z.infer<typeof adminSearchSchema>;

export const banUserSchema = z.object({
  banReason: z.string().optional(),
  banExpiresIn: z.number().int().positive().optional(),
});

export type BanUserValues = z.infer<typeof banUserSchema>;

export const setRoleSchema = z.object({
  role: z.enum(["admin", "user"]),
});

export type SetRoleValues = z.infer<typeof setRoleSchema>;
