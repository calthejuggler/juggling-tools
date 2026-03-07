import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";

import { AuthPageLayout } from "@/components/auth-page-layout";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { authClient, signIn } from "@/lib/auth-client";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { GRAPH_SEARCH } from "@/routes/_authed";

import { m } from "@/paraglide/messages.js";

export function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [showResend, setShowResend] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema()),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError("");
    setShowResend(false);
    try {
      const res = await signIn.email(values);
      if (res.error) {
        if (res.error.code === "EMAIL_NOT_VERIFIED") {
          setShowResend(true);
        } else if (res.error.code === "BANNED_USER") {
          setServerError(m.auth_banned_message());
        } else {
          setServerError(res.error.message ?? m.auth_login_failed());
        }
      } else {
        navigate({ to: "/", search: GRAPH_SEARCH });
      }
    } catch {
      setServerError(m.auth_unexpected_error());
    }
  }

  async function handleResendVerification() {
    setResendStatus("sending");
    try {
      const res = await authClient.sendVerificationEmail({
        email: form.getValues("email"),
        callbackURL: `${window.location.origin}/verify-email`,
      });
      if (res.error) {
        setServerError(res.error.message ?? m.auth_unexpected_error());
        setResendStatus("idle");
      } else {
        setResendStatus("sent");
      }
    } catch {
      setServerError(m.auth_unexpected_error());
      setResendStatus("idle");
    }
  }

  return (
    <AuthPageLayout title={m.auth_sign_in()}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="email"
          control={form.control}
          label={m.auth_email_label()}
          type="email"
          placeholder={m.auth_email_placeholder()}
          autoComplete="email"
        />
        <FormField
          name="password"
          control={form.control}
          label={m.auth_password_label()}
          type="password"
          placeholder={m.auth_password_placeholder()}
          autoComplete="current-password"
        />
        {serverError && (
          <div role="alert" className="text-destructive text-sm">
            <p>{serverError}</p>
          </div>
        )}
        {showResend && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{m.auth_email_not_verified()}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={resendStatus === "sending" || resendStatus === "sent"}
              onClick={handleResendVerification}
            >
              {resendStatus === "sending"
                ? m.auth_resend_verification_sending()
                : resendStatus === "sent"
                  ? m.auth_resend_verification_sent()
                  : m.auth_resend_verification()}
            </Button>
          </div>
        )}
        <div className="text-right">
          <Link to="/forgot-password" className="text-muted-foreground text-xs underline">
            {m.auth_forgot_password()}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? m.auth_signing_in() : m.auth_sign_in()}
        </Button>
      </form>
      <p className="text-muted-foreground mt-4 text-center text-sm">
        {m.auth_no_account()}{" "}
        <Link to="/signup" className="text-primary underline">
          {m.auth_sign_up()}
        </Link>
      </p>
    </AuthPageLayout>
  );
}
