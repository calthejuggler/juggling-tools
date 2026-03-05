import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { GithubIcon, MailIcon, MessageSquareIcon, SendIcon } from "lucide-react";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/lib/api";
import { contactSchema, type ContactValues } from "@/lib/schemas";

import { m } from "@/paraglide/messages.js";

export function FooterPanel() {
  return (
    <div className="fixed right-4 bottom-4 z-40 flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <a
          href="https://github.com/calthejuggler/juggling-tools"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubIcon />
          {m.footer_github()}
        </a>
      </Button>
      <ContactDialog />
    </div>
  );
}

function ContactDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema()),
    defaultValues: { name: "", email: "", message: "" },
  });

  async function onSubmit(values: ContactValues) {
    setStatus("idle");
    try {
      const res = await fetch(`${API_URL}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setStatus("idle");
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquareIcon />
          {m.footer_contact()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.contact_title()}</DialogTitle>
          <DialogDescription>{m.contact_description()}</DialogDescription>
        </DialogHeader>

        {status === "sent" ? (
          <p className="text-sm text-green-600 dark:text-green-400">{m.contact_success()}</p>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            <FormField
              name="name"
              control={form.control}
              label={m.contact_name_label()}
              placeholder={m.contact_name_placeholder()}
            />
            <FormField
              name="email"
              control={form.control}
              label={m.contact_email_label()}
              type="email"
              placeholder={m.contact_email_placeholder()}
            />
            <Controller
              name="message"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="message">{m.contact_message_label()}</FieldLabel>
                  <Textarea
                    {...field}
                    id="message"
                    placeholder={m.contact_message_placeholder()}
                    rows={4}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {status === "error" && <p className="text-destructive text-sm">{m.contact_error()}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <SendIcon />
              {form.formState.isSubmitting ? m.contact_sending() : m.contact_send()}
            </Button>
          </form>
        )}

        <Separator />

        <div className="text-muted-foreground text-sm">
          <p className="text-foreground font-medium">{m.contact_custom_title()}</p>
          <p className="mt-1">{m.contact_custom_description()}</p>
          <a
            href="mailto:calthejuggler@gmail.com"
            className="text-primary mt-2 inline-flex items-center gap-1.5 hover:underline"
          >
            <MailIcon className="size-4" />
            calthejuggler@gmail.com
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
