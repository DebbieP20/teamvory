import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/urls";

// Better Auth handles passwords (hashed with scrypt) and sessions.
// It is only called from our own server actions; its HTTP endpoints are
// deliberately NOT mounted, so sign-up always goes through our flow (which
// also creates the business) and every action has our own rate limits.
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appUrl(),
  telemetry: { enabled: false },
  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your TeamVory password",
        text:
          `Hi ${user.name},\n\n` +
          `Someone asked to reset the password for your TeamVory account. ` +
          `If it was you, open this link within 1 hour to choose a new password:\n\n${link}\n\n` +
          `If it wasn't you, you can ignore this email. Your password won't change.`,
      });
    },
  },
  plugins: [nextCookies()],
});
