# TeamVory launch checklist

Everything needed to put TeamVory online for the first client, in order. Items marked **(you)** need your accounts or decisions; the rest are done or are done together.

Recommended setup (decision 28): **Vercel** (app + daily job) and **Neon** (PostgreSQL), both on their free plans, plus **Resend** for email. All three fit a business with about 10 employees.

---

## 1. Accounts and domain **(you)**

- [ ] **Domain**: register `teamvory.com` (it looked free when checked). About $10–15 a year. Any registrar works (Cloudflare, Namecheap, Porkbun…).
- [ ] **Vercel**: sign up with your GitHub account (Hobby plan).
- [ ] **Neon**: sign up (Free plan). Create a project in **US East** (close to the business's time zone, America/New_York).
- [ ] **Resend**: sign up (Free plan: 3,000 emails a month, 100 a day).
- [ ] **Business email** for the Contact page and replies, e.g. `hello@teamvory.com` (email forwarding from the registrar is enough).

## 2. Database (Neon)

- [ ] In Neon, copy two connection strings for the `main` branch:
  - **Pooled** (host contains `-pooler`): this is `DATABASE_URL`.
  - **Direct** (no `-pooler`): this is `DIRECT_URL`, used only for migrations.
- [ ] Make a second Neon branch called `preview` for Vercel preview deployments, so test deploys never touch real data.
- [ ] Backups: Neon keeps a restore history (point-in-time restore). Check how far back the free plan goes and note it here: ______.

The live database starts **empty**: no practice data goes online. The first owner signs up at `/signup`, then invites the team.

## 3. Email (Resend)

- [ ] Add the domain in Resend and create the DNS records it shows (SPF, DKIM) at the registrar. Wait until Resend says **Verified**.
- [ ] Create an API key (sending access only): this is `RESEND_API_KEY`.
- [ ] Decide the sender: `EMAIL_FROM="TeamVory <hello@teamvory.com>"`.

## 4. Vercel project

- [ ] **Add New → Project → Import** `DebbieP20/teamvory`. Framework: Next.js (detected). The build runs `npm run vercel-build`, which applies database migrations and then builds.
- [ ] **Environment variables** (Settings → Environment Variables). Use new secrets, never the ones from your computer:

| Name | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Neon `main`, pooled | Neon `preview`, pooled |
| `DIRECT_URL` | Neon `main`, direct | Neon `preview`, direct |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | a different one |
| `BETTER_AUTH_URL` | `https://teamvory.com` | leave empty (uses the preview address) |
| `CRON_SECRET` | `openssl rand -base64 32` | a different one |
| `IP_HASH_SALT` | `openssl rand -base64 32` | a different one |
| `RESEND_API_KEY` | from Resend | leave empty (emails go to the log) |
| `EMAIL_FROM` | `TeamVory <hello@teamvory.com>` | same |
| `CONTACT_INBOX_EMAIL` | your business email | leave empty |

- [ ] **Never set** `RATE_LIMITS`, `EMAIL_CAPTURE_FILE` or `CONTACT_MAX_PER_HOUR` online. They're for the automated tests, and the live site ignores the first two anyway.
- [ ] **Deploy.** Then **Settings → Domains**: add `teamvory.com` (and `www`), and add the DNS records Vercel shows at the registrar.
- [ ] **Cron**: `vercel.json` runs `/api/cron/daily` every day at 13:00 UTC (9 AM in summer, 8 AM in winter, New York time). Check it appears under **Settings → Cron Jobs**. Vercel sends `CRON_SECRET` with it automatically.

## 5. Content **(you)**

- [ ] Contact details (email, phone, social links) in `lib/site-config.ts` (send them over and they'll be added).
- [ ] Read **Privacy** and **Terms** (`/privacy`, `/terms`), ideally with someone who knows the rules where the business operates, since employee names, emails and availability are stored.
- [ ] Pricing for the home page, once decided (per business per month).

## 6. Smoke test right after launch

On the live site, with real email:

- [ ] `https://teamvory.com/api/health` shows `{"status":"ok","database":"ok"}`.
- [ ] Sign up as the owner. Create the business.
- [ ] Invite one employee using a real inbox; the invitation **email arrives** (check spam too) and the link works.
- [ ] **Forgot password** sends a working reset email.
- [ ] Set up next week's shifts, **Build schedule**, **Publish**: the employee gets the schedule email and sees it under My schedule on their phone.
- [ ] Download the PDF and PNG from **Reports**.
- [ ] Next morning: the daily job ran (Vercel → Logs → `/api/cron/daily` returns `ok`).
- [ ] Contact form message reaches `CONTACT_INBOX_EMAIL`.

## 7. Security (done in M9; keep it that way)

- [x] Every server action checks the login, the role and the business before reading or changing anything; ids from forms are validated first.
- [x] Rate limits on sign-up, log in, password reset, invitations, contact form, open-shift posts and swap requests.
- [x] Passwords hashed with scrypt (Better Auth); reset links expire in 1 hour and log out other sessions.
- [x] Security headers on every page: no framing (clickjacking), no MIME sniffing, strict referrer, HTTPS only (HSTS), no `X-Powered-By`.
- [x] Daily job protected by `CRON_SECRET`; downloads for owners and managers only.
- [x] Test-only switches are ignored on the live site.
- [x] CI fails on high or critical known vulnerabilities (`npm audit`); Dependabot opens weekly update pull requests and GitHub security alerts are on.
- [x] Rate limits use the visitor address from `x-forwarded-for`, which Vercel sets itself (it can't be faked there). If the app ever moves elsewhere, check that host does the same.

## 8. After launch

- [ ] **Dependabot**: each Monday, review its pull requests. When CI is green, merge. Prisma and Next.js major versions are excluded on purpose and upgraded by hand.
- [ ] Watch **Vercel → Logs** for errors the first weeks.
- [ ] Rotate `BETTER_AUTH_SECRET` (logs everyone out) and `CRON_SECRET` if they're ever exposed.
- [ ] Future features (technical plan, section 10): SMS (M10), calendar sync (on hold).

## Local data

- The browser tests use their own database (`teamvory_test`), so test businesses no longer pile up in your local data.
- Practice accounts can be removed from your local database any time:
  `node scripts/remove-practice-data.mjs` (preview), then `node scripts/remove-practice-data.mjs --yes`.
