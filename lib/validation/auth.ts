import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(200, "That email address is too long.")
  .pipe(z.email("Please enter a valid email address."));

const name = z.string().trim().min(1, "Please enter your name.").max(100, "Please keep it under 100 characters.");

// Long passphrases are better than complex rules (NIST guidance): just a minimum length.
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Please keep it under 128 characters.");

export const signUpSchema = z.object({
  name,
  businessName: z
    .string()
    .trim()
    .min(1, "Please enter your business name.")
    .max(100, "Please keep it under 100 characters."),
  email,
  password: newPassword,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password.").max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

export const createBusinessSchema = z.object({ businessName: signUpSchema.shape.businessName });

export const inviteSchema = z.object({
  email,
  role: z.enum(["EMPLOYEE", "MANAGER"]),
});

export const acceptInviteNewAccountSchema = z.object({
  token: z.string().min(1),
  name,
  password: newPassword,
});

/** Turns zod errors into one message per field, for the forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
