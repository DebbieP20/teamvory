// Switches the automated tests use (see playwright.config.ts). On the live site
// (Vercel production) they're ignored even if someone sets them by mistake, so rate
// limits always apply there and emails are always really sent.
const live = process.env.VERCEL_ENV === "production";

export const rateLimitsOff = () => !live && process.env.RATE_LIMITS === "off";
export const emailCaptureFile = () => (live ? undefined : process.env.EMAIL_CAPTURE_FILE);
