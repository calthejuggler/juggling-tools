import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { db } from "../db";
import { sendEmail } from "./email";
import { resetPasswordTemplate, verifyEmailTemplate } from "./email-templates";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  plugins: [admin({ defaultRole: "user" })],
  user: {
    additionalFields: {
      stateGraphOnboardingCompleteAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  trustedOrigins: [Bun.env.CORS_ORIGIN ?? "http://localhost:5173"],
  trustedProxies: ["127.0.0.1", "::1", "172.16.0.0/12"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: resetPasswordTemplate(url),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: verifyEmailTemplate(url),
      });
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
      "/send-verification-email": { window: 300, max: 3 },
      "/get-session": { window: 10, max: 30 },
    },
  },
});
