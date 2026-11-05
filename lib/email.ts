import "server-only";
import { Resend } from "resend";

type Email = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

/**
 * Sends an email through Resend. Returns true if it was sent.
 * Without RESEND_API_KEY (e.g. on a developer's computer) the email is only
 * printed to the server console, so everything else keeps working.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email not sent: no RESEND_API_KEY]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`);
    return false;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "TeamVory <onboarding@resend.dev>",
    to: email.to,
    subject: email.subject,
    text: email.text,
    replyTo: email.replyTo,
  });
  if (error) {
    console.error("Email failed", error);
    return false;
  }
  return true;
}
