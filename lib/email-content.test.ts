import { describe, expect, it } from "vitest";
import { type EmailContent, escapeHtml, renderEmail } from "./email-content";

const invite: EmailContent = {
  subject: "Debbie invited you to PPP on TeamVory",
  icon: "invite",
  heading: "Join PPP on TeamVory",
  greeting: "Hi,",
  businessName: "PPP",
  blocks: [
    { type: "p", text: "Debbie invited you to join PPP on TeamVory as a team member." },
    { type: "button", label: "Accept invitation", url: "https://teamvory.vercel.app/invite/abc" },
    { type: "box", title: "What's TeamVory?", text: "Where you'll see your shifts." },
    { type: "small", text: "If you weren't expecting it, you can ignore this email." },
  ],
};

describe("renderEmail", () => {
  it("writes the plain-text version in reading order, with the link first", () => {
    const { text } = renderEmail(invite);
    expect(text).toBe(
      "Hi,\n\nDebbie invited you to join PPP on TeamVory as a team member.\n\n" +
        "Accept invitation: https://teamvory.vercel.app/invite/abc\n\n" +
        "What's TeamVory? Where you'll see your shifts.\n\n" +
        "If you weren't expecting it, you can ignore this email.\n\nSent by TeamVory for PPP\n",
    );
  });

  it("builds the designed version with the logo, heading, button and footer", () => {
    const { html } = renderEmail(invite);
    expect(html).toContain("/email/logo-white.png");
    expect(html).toContain("/email/invite.png");
    expect(html).toContain(">Join PPP on TeamVory</h1>");
    expect(html).toContain('href="https://teamvory.vercel.app/invite/abc"');
    expect(html).toContain("Accept invitation &rarr;");
    expect(html).toContain("Sent by TeamVory for PPP.");
  });

  it("lists items with bullets in text, or without when asked", () => {
    const { text } = renderEmail({
      ...invite,
      blocks: [
        { type: "list", title: "What changed", items: ["+ Added: Mon"], bullets: false },
        { type: "list", title: "Your shifts", items: [], empty: "You're not on the schedule this week." },
        { type: "list", title: "Shift", items: ["Tue, 5 PM – 9 PM"] },
      ],
    });
    expect(text).toContain("What changed:\n+ Added: Mon");
    expect(text).toContain("Your shifts:\nYou're not on the schedule this week.");
    expect(text).toContain("Shift:\n• Tue, 5 PM – 9 PM");
  });

  it("shows names and notes as text, never as HTML", () => {
    const { html } = renderEmail({
      ...invite,
      heading: 'Join <b>Bad</b> & "Co"',
      blocks: [{ type: "p", text: '<img src=x onerror="alert(1)">' }],
    });
    expect(html).not.toContain("<b>Bad</b>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("Join &lt;b&gt;Bad&lt;/b&gt; &amp; &quot;Co&quot;");
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<a href="x">Tom's & co</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom&#39;s &amp; co&lt;/a&gt;");
  });
});
