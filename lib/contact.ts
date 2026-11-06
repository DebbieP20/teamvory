import { z } from "zod";

// Validation for the public Contact form. Shared by the form (for the field
// limits) and the server action (which is the real check).
export const contactLimits = {
  name: 100,
  email: 200,
  message: 5000,
  messageMin: 10,
} as const;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(contactLimits.name, `Please keep your name under ${contactLimits.name} characters.`),
  email: z
    .string()
    .trim()
    .max(contactLimits.email, "That email address is too long.")
    .pipe(z.email("Please enter a valid email address.")),
  message: z
    .string()
    .trim()
    .min(contactLimits.messageMin, `Please write at least ${contactLimits.messageMin} characters.`)
    .max(contactLimits.message, `Please keep your message under ${contactLimits.message} characters.`),
  // Spam trap: hidden from people, so only bots fill it in.
  website: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = "name" | "email" | "message";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<ContactField, string>>;
      values?: Partial<Record<ContactField, string>>;
    };
