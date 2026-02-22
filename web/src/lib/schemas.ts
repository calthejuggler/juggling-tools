import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupValues = z.infer<typeof signupSchema>;

const MAX_MAX_HEIGHT = 13;

export const graphsSchema = z
  .object({
    num_props: z.number().int().min(1).max(MAX_MAX_HEIGHT),
    max_height: z.number().int().min(1).max(MAX_MAX_HEIGHT),
    compact: z.boolean(),
  })
  .refine((data) => data.max_height >= data.num_props, {
    message: "Max height must be >= number of props",
    path: ["max_height"],
  });

export type GraphsValues = z.infer<typeof graphsSchema>;
