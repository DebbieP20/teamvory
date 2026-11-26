import { appUrl } from "@/lib/urls";

// Every email TeamVory sends is described once (heading, paragraphs, lists, a button)
// and turned into two versions: a designed HTML email in the brand colors, and plain text
// for email apps that don't show HTML. Images live in public/email (npm run email-images).

export type EmailIcon = "invite" | "schedule" | "changed" | "reminder" | "alert" | "swap" | "approved" | "declined" | "password";

export type EmailBlock =
  | { type: "p"; text: string }
  | { type: "list"; title: string; items: string[]; empty?: string; bullets?: boolean }
  | { type: "button"; label: string; url: string }
  | { type: "small"; text: string };

export type EmailContent = {
  subject: string;
  icon: EmailIcon;
  heading: string;
  greeting?: string;
  blocks: EmailBlock[];
  /** Named in the footer: "Sent by TeamVory for <business>". */
  businessName?: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

export function renderEmail(c: EmailContent): RenderedEmail {
  return { subject: c.subject, text: emailText(c), html: emailHtml(c) };
}

// --- Plain text ---------------------------------------------------------------------------

export function emailText(c: EmailContent): string {
  const parts: string[] = c.greeting ? [c.greeting] : [];
  for (const b of c.blocks) {
    if (b.type === "p" || b.type === "small") parts.push(b.text);
    else if (b.type === "button") parts.push(`${b.label}: ${b.url}`);
    else {
      const lines = b.items.length ? b.items.map((i) => (b.bullets === false ? i : `• ${i}`)) : [b.empty ?? ""];
      parts.push(`${b.title}:\n${lines.join("\n")}`);
    }
  }
  parts.push(c.businessName ? `Sent by TeamVory for ${c.businessName}` : "Sent by TeamVory");
  return parts.join("\n\n") + "\n";
}

// --- HTML -----------------------------------------------------------------------------------
// Tables and inline styles, because that's what email apps (Gmail, Outlook, Apple Mail) support.

const NAVY = "#0B1F44";
const TEAL = "#14B8A6";
const TEXT = "#334155";
const MUTED = "#64748B";
const LINE = "#E2E8F0";
const PAGE = "#F1F5F9";
const BODY_FONT = "'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const HEADING_FONT = "'Poppins', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Makes text safe inside HTML (names and notes are typed by people). */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

const p = (text: string, style = "") =>
  `<p style="margin:0 0 16px;font-family:${BODY_FONT};font-size:16px;line-height:1.6;color:${TEXT};${style}">${escapeHtml(text)}</p>`;

function block(b: EmailBlock): string {
  switch (b.type) {
    case "p":
      return p(b.text);
    case "small":
      return p(b.text, `font-size:13px;color:${MUTED};`);
    case "button":
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto;"><tr>` +
        `<td style="border-radius:999px;background:${TEAL};">` +
        `<a href="${escapeHtml(b.url)}" style="display:inline-block;padding:14px 32px;border-radius:999px;font-family:${HEADING_FONT};font-size:16px;font-weight:600;color:${NAVY};text-decoration:none;">${escapeHtml(b.label)} &rarr;</a>` +
        `</td></tr></table>`
      );
    case "list": {
      const rows = b.items.length
        ? b.items.map(
            (item, i) =>
              `<tr><td style="padding:11px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font-family:${BODY_FONT};font-size:15px;line-height:1.45;color:${NAVY};">` +
              `${b.bullets === false ? "" : `<span style="color:${TEAL};font-weight:700;">&#9679;</span>&nbsp;&nbsp;`}${escapeHtml(item)}</td></tr>`,
          )
        : [`<tr><td style="padding:11px 16px;font-family:${BODY_FONT};font-size:15px;color:${MUTED};">${escapeHtml(b.empty ?? "")}</td></tr>`];
      return (
        `<p style="margin:24px 0 8px;font-family:${HEADING_FONT};font-size:15px;font-weight:600;color:${NAVY};">${escapeHtml(b.title)}</p>` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#F8FAFC;border:1px solid ${LINE};border-radius:12px;">${rows.join("")}</table>`
      );
    }
  }
}

export function emailHtml(c: EmailContent): string {
  const base = appUrl();
  const preview = c.blocks.find((b) => b.type === "p")?.text ?? c.heading;
  const footer = c.businessName ? `Sent by TeamVory for ${c.businessName}.` : "Sent by TeamVory.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(c.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Poppins:wght@600&display=swap" rel="stylesheet">
<style>
  @media (max-width: 620px) {
    .card { padding: 28px 22px !important; }
    .tagline { display: none !important; }
    .heading { font-size: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:${NAVY};border-radius:16px 16px 0 0;padding:22px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><img src="${base}/email/logo-white.png" width="168" height="26" alt="TeamVory" style="display:block;border:0;font-family:${HEADING_FONT};font-size:22px;font-weight:600;color:#FFFFFF;"></td>
      <td class="tagline" align="right" style="font-family:${BODY_FONT};font-size:13px;font-style:italic;color:#CBD5E1;">Your team, perfectly organized.</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:${TEAL};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
  <tr><td class="card" style="background:#FFFFFF;padding:36px 40px 28px;">
    <img src="${base}/email/${c.icon}.png" width="64" height="64" alt="" style="display:block;margin:0 auto 18px;border:0;">
    <h1 class="heading" style="margin:0 0 24px;text-align:center;font-family:${HEADING_FONT};font-size:24px;line-height:1.3;font-weight:600;color:${NAVY};">${escapeHtml(c.heading)}</h1>
    ${c.greeting ? p(c.greeting) : ""}
    ${c.blocks.map(block).join("\n    ")}
  </td></tr>
  <tr><td style="background:${NAVY};border-radius:0 0 16px 16px;padding:22px 28px;text-align:center;">
    <img src="${base}/email/logo-white.png" width="112" height="17" alt="TeamVory" style="display:inline-block;border:0;font-family:${HEADING_FONT};font-size:15px;font-weight:600;color:#FFFFFF;">
    <p style="margin:10px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:#94A3B8;">${escapeHtml(footer)} Smarter scheduling, a more connected team.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
