// Sender names and addresses for outgoing email (no server code, so it can be unit tested).

export type Address = { name: string; address: string };

/** Reads `Name <address>` or a bare address, as written in EMAIL_FROM. */
export function parseAddress(value: string): Address {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^<>\s]+)>\s*$/);
  return match ? { name: match[1].trim(), address: match[2] } : { name: "", address: value.trim() };
}

/** A sender name without the characters that could break an email header. */
export function safeName(name: string): string {
  return name.replace(/["\\<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
}

/** `"Name" <address>`, or just the address when there's no name. */
export function formatAddress({ name, address }: Address): string {
  const clean = safeName(name);
  return clean ? `"${clean}" <${address}>` : address;
}

/** How a business's emails to its team are signed. */
export const teamSenderName = (businessName: string) => `${businessName} via TeamVory`;
