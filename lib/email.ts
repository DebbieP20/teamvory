import "server-only";
import { appendFile } from "node:fs/promises";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { formatAddress, parseAddress, safeName } from "@/lib/email-address";
import { emailCaptureFile } from "@/lib/test-switches";

type Email = {
  to: string;
  subject: string;
  text: string;
  /** The designed version (lib/email-content.ts); text is the fallback. */
  html?: string;
  replyTo?: string;
  /** The sender's name, e.g. "Harbor Lane Café via TeamVory". Defaults to TeamVory. */
  fromName?: string;
};

/**
 * Which service sends email: Resend (business launch, from your own domain), a Gmail
 * account (free trial, see docs/launch-checklist.md), or none (printed to the log).
 */
export function emailService(): "resend" | "gmail" | null {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  return null;
}

/**
 * Sends an email. Returns true if it was sent.
 * Without an email service (e.g. on a developer's computer) the email is only
 * printed to the server console, so everything else keeps working.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  // Automated tests read emails from a file instead (ignored on the live site).
  const captureFile = emailCaptureFile();
  if (captureFile) {
    await appendFile(captureFile, JSON.stringify({ ...email, sentAt: new Date().toISOString() }) + "\n");
    return true;
  }

  const service = emailService();
  if (!service) {
    console.info(`[email not sent: no email service]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`);
    return false;
  }
  try {
    return service === "resend" ? await sendWithResend(email) : await fewAtATime(() => sendWithGmail(email));
  } catch (e) {
    console.error("Email failed", e);
    return false;
  }
}

async function sendWithResend(email: Email): Promise<boolean> {
  const from = parseAddress(process.env.EMAIL_FROM ?? "TeamVory <onboarding@resend.dev>");
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: formatAddress({ name: email.fromName ?? from.name, address: from.address }),
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: email.replyTo,
  });
  if (error) {
    console.error("Email failed", error);
    return false;
  }
  return true;
}

let gmail: Transporter | undefined;

/** Gmail sends only as its own address: the name shown changes, the address is always GMAIL_USER. */
async function sendWithGmail(email: Email): Promise<boolean> {
  gmail ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // Google shows app passwords in groups of four; the spaces aren't part of it.
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, "") },
  });
  await gmail.sendMail({
    from: { name: safeName(email.fromName ?? "TeamVory"), address: process.env.GMAIL_USER! },
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: email.replyTo,
  });
  return true;
}

// Publishing emails the whole team at once; Gmail accepts only a few connections at a time.
const GMAIL_AT_ONCE = 3;
let sending = 0;
const waiting: (() => void)[] = [];

async function fewAtATime<T>(job: () => Promise<T>): Promise<T> {
  if (sending >= GMAIL_AT_ONCE) await new Promise<void>((go) => waiting.push(go));
  sending++;
  try {
    return await job();
  } finally {
    sending--;
    waiting.shift()?.();
  }
}
