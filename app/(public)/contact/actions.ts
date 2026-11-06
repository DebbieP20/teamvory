"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { type ContactField, type ContactFormState, contactSchema } from "@/lib/contact";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const HOUR = 60 * 60 * 1000;

export async function sendContactMessage(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
    website: String(formData.get("website") ?? ""),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    // A filled-in spam trap means a bot: pretend it worked and save nothing.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) {
      return { status: "success" };
    }
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField;
      fieldErrors[field] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors,
      values: { name: raw.name, email: raw.email, message: raw.message },
    };
  }

  const { name, email, message } = parsed.data;
  const ipHash = await hashClientIp();

  // Rate limit: a few messages per hour from the same address is plenty.
  const maxPerHour = Number(process.env.CONTACT_MAX_PER_HOUR ?? 5);
  const recent = await db.contactMessage.count({
    where: { ipHash, createdAt: { gte: new Date(Date.now() - HOUR) } },
  });
  if (recent >= maxPerHour) {
    return {
      status: "error",
      message: "You've sent several messages already. Please try again in an hour.",
      values: { name, email, message },
    };
  }

  // Save first, so a failed email never loses a message.
  const saved = await db.contactMessage.create({ data: { name, email, message, ipHash } });

  const inbox = process.env.CONTACT_INBOX_EMAIL;
  if (inbox) {
    const sent = await sendEmail({
      to: inbox,
      replyTo: email,
      subject: `TeamVory contact form: ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    if (sent) {
      await db.contactMessage.update({ where: { id: saved.id }, data: { emailedAt: new Date() } });
    }
  }

  return { status: "success" };
}

/** SHA-256 of the visitor's IP: enough to rate-limit without storing the IP itself. */
async function hashClientIp(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const salt = process.env.IP_HASH_SALT ?? "teamvory";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
