import { Elysia, t } from "elysia";

import { sendEmail } from "../../lib/email";
import { loggingPlugin } from "../../lib/logging";
import { contactRateLimit } from "../../lib/rate-limit";

const CONTACT_EMAIL = "calthejuggler@gmail.com";

export const contactRoute = new Elysia({ prefix: "/contact" })
  .use(contactRateLimit)
  .use(loggingPlugin)
  .post(
    "/",
    async ({ body, set, wideEvent }) => {
      const { name, email, message } = body;

      wideEvent.contact_name = name;
      wideEvent.contact_email = email;

      try {
        await sendEmail({
          to: CONTACT_EMAIL,
          subject: `[Juggling Tools] Feedback from ${name.replace(/[\r\n]/g, "")}`,
          html: `
            <h2>New feedback from Juggling Tools</h2>
            <p><strong>Name:</strong> ${Bun.escapeHTML(name)}</p>
            <p><strong>Email:</strong> ${Bun.escapeHTML(email)}</p>
            <hr />
            <p>${Bun.escapeHTML(message).replace(/\n/g, "<br />")}</p>
          `,
        });
      } catch {
        set.status = 500;
        return { error: "Failed to send message" };
      }

      return { success: true };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        email: t.String({ format: "email", maxLength: 254 }),
        message: t.String({ minLength: 1, maxLength: 5000 }),
      }),
      detail: {
        summary: "Send contact feedback",
        description: "Sends a contact/feedback email from a site visitor.",
        tags: ["Contact v1"],
      },
    },
  );
