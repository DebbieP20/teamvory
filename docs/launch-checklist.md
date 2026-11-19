# TeamVory launch checklist

TeamVory goes online in two stages:

- **A. Free trial ($0):** the real app online, with real emails, for testing with a few people. Nobody pays yet.
- **B. Business launch:** your own domain and a paid plan, once a business pays for TeamVory.

Moving from A to B changes settings only, not code, and the trial's data can stay.

Items marked **(you)** need your accounts or decisions.

---

# A. Free trial ($0)

| Part | Service | Notes |
|---|---|---|
| The app and the daily job | **Vercel**, Hobby plan (free) | Allowed while TeamVory isn't used commercially. The once-a-day job fits the free plan. |
| Web address | `teamvory.vercel.app` (or the one Vercel offers) | No domain needed yet. |
| Database | **Neon**, Free plan | |
| Email | **A Gmail account** made for TeamVory | About 500 emails a day. |

## A1. Accounts **(you)**

- [ ] **Vercel**: sign up with your GitHub account (Hobby plan).
- [ ] **Neon**: sign up (Free plan). Create a project in **US East** (close to the business's time zone, America/New_York).
- [ ] **Gmail**: create a new Google account just for TeamVory (for example `teamvory.app@gmail.com`), not your personal one.

## A2. Gmail app password **(you)**

An app password lets TeamVory send email from that Gmail account and do nothing else. You can delete it at any time.

1. [ ] Sign in to the new Gmail account. Open **myaccount.google.com → Security** and turn on **2-Step Verification**.
2. [ ] Open **myaccount.google.com/apppasswords**, type the name `TeamVory` and choose **Create**.
3. [ ] Google shows a 16-letter password. Paste it **only** into Vercel (step A4), never in a chat, an email or GitHub. Spaces don't matter.

How the emails look: team emails show **"*Business name* via TeamVory"** as the sender (from the Gmail address), and when an employee replies, the reply goes to the business owner. Password reset emails show "TeamVory".

## A3. Database (Neon)

- [ ] In Neon, copy two connection strings for the `main` branch:
  - **Pooled** (host contains `-pooler`): this is `DATABASE_URL`.
  - **Direct** (no `-pooler`): this is `DIRECT_URL`, used only for migrations.
- [ ] Make a second Neon branch called `preview` for Vercel preview deployments, so test deploys never touch real data.
- [ ] Backups: Neon keeps a restore history (point-in-time restore). Check how far back the free plan goes and note it here: ______.

The online database starts **empty**: no practice data goes online. The first owner signs up at `/signup`, then invites the team.

## A4. Vercel project

- [ ] **Add New → Project → Import** `DebbieP20/teamvory`. Framework: Next.js (detected). The build runs `npm run vercel-build`, which applies database migrations and then builds.
- [ ] Note the address Vercel gives the project (for example `https://teamvory.vercel.app`).
- [ ] **Environment variables** (Settings → Environment Variables). Use new secrets, never the ones from your computer:

| Name | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Neon `main`, pooled | Neon `preview`, pooled |
| `DIRECT_URL` | Neon `main`, direct | Neon `preview`, direct |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | a different one |
| `BETTER_AUTH_URL` | the Vercel address, e.g. `https://teamvory.vercel.app` | leave empty (uses the preview address) |
| `CRON_SECRET` | `openssl rand -base64 32` | a different one |
| `IP_HASH_SALT` | `openssl rand -base64 32` | a different one |
| `GMAIL_USER` | the TeamVory Gmail address | leave empty (emails go to the log) |
| `GMAIL_APP_PASSWORD` | the app password from A2 | leave empty |
| `CONTACT_INBOX_EMAIL` | the TeamVory Gmail address | leave empty |

- [ ] Leave `RESEND_API_KEY` and `EMAIL_FROM` empty for now (they're for stage B).
- [ ] **Never set** `RATE_LIMITS`, `EMAIL_CAPTURE_FILE` or `CONTACT_MAX_PER_HOUR` online. They're for the automated tests, and the live site ignores the first two anyway.
- [ ] **Deploy.**
- [ ] **Cron**: `vercel.json` runs `/api/cron/daily` every day at 13:00 UTC (9 AM in summer, 8 AM in winter, New York time). Check it appears under **Settings → Cron Jobs**. Vercel sends `CRON_SECRET` with it automatically.

## A5. Smoke test

On the live site, with real email:

- [ ] `/api/health` shows `{"status":"ok","database":"ok"}`.
- [ ] Sign up as the owner. Create the business.
- [ ] Invite one employee using a real inbox. The invitation **email arrives** from "*Business* via TeamVory" (check spam too) and the link works.
- [ ] **Forgot password** sends a working reset email.
- [ ] Set up next week's shifts, **Build schedule**, **Publish**: the employee gets the schedule email and sees it under My schedule on their phone. **Reply** to that email: the reply reaches the owner.
- [ ] Download the PDF and PNG from **Reports**.
- [ ] Next morning: the daily job ran (Vercel → Logs → `/api/cron/daily` returns `ok`).
- [ ] Contact form message reaches `CONTACT_INBOX_EMAIL`.

If an email doesn't arrive: **Vercel → Logs** shows `Email failed` with Gmail's reason. The usual cause is a mistyped app password, or 2-Step Verification being off.

---

# B. Business launch

## B1. Domain and email **(you)**

- [ ] **Domain**: register `teamvory.com` (it looked free when checked). About $10–15 a year. Any registrar works (Cloudflare, Namecheap, Porkbun…).
- [ ] **Business email** for the Contact page and replies, e.g. `hello@teamvory.com` (email forwarding from the registrar is enough).
- [ ] **Resend**: sign up (Free plan: 3,000 emails a month, 100 a day). Add the domain and create the DNS records it shows (SPF, DKIM) at the registrar. Wait until Resend says **Verified**.
- [ ] Create a Resend API key (sending access only).

## B2. Hosting plan **(you)**

Vercel's free plan doesn't allow commercial use, so pick one:

- [ ] **Vercel Pro** ($20 a month): nothing else changes.
- [ ] or **Render Starter** (about $7 a month, plus about $1 a month for the daily job). This needs a little work first: the daily job moves from `vercel.json` to a Render Cron Job, and rate limits must be checked against Render's `x-forwarded-for` (see section 7).

## B3. Switch the settings

- [ ] In the host's environment variables:
  - `RESEND_API_KEY`: the key from B1. Once it's set, emails go through Resend instead of Gmail.
  - `EMAIL_FROM`: `TeamVory <hello@teamvory.com>`. Team emails still show "*Business* via TeamVory", now from your domain.
  - `BETTER_AUTH_URL`: `https://teamvory.com`
  - `CONTACT_INBOX_EMAIL`: your business email.
  - Delete `GMAIL_USER` and `GMAIL_APP_PASSWORD`, then delete the app password in Google.
- [ ] **Settings → Domains**: add `teamvory.com` (and `www`), and add the DNS records shown at the registrar.
- [ ] Redeploy, then repeat the **A5 smoke test** on `https://teamvory.com`.

## B4. Content **(you)**

- [ ] Contact details (email, phone, social links) in `lib/site-config.ts` (send them over and they'll be added).
- [ ] Read **Privacy** and **Terms** (`/privacy`, `/terms`), ideally with someone who knows the rules where the business operates, since employee names, emails and availability are stored.
- [ ] Pricing for the home page, once decided (per business per month).

---

## 7. Security (done in M9; keep it that way)

- [x] Every server action checks the login, the role and the business before reading or changing anything; ids from forms are validated first.
- [x] Rate limits on sign-up, log in, password reset, invitations, contact form, open-shift posts and swap requests.
- [x] Passwords hashed with scrypt (Better Auth); reset links expire in 1 hour and log out other sessions.
- [x] Security headers on every page: no framing (clickjacking), no MIME sniffing, strict referrer, HTTPS only (HSTS), no `X-Powered-By`.
- [x] Daily job protected by `CRON_SECRET`; downloads for owners and managers only.
- [x] Test-only switches are ignored on the live site.
- [x] CI fails on high or critical known vulnerabilities (`npm audit`); Dependabot opens weekly update pull requests and GitHub security alerts are on.
- [x] Rate limits use the visitor address from `x-forwarded-for`, which Vercel sets itself (it can't be faked there). If the app ever moves elsewhere, check that host does the same.
- [x] Sender names are cleaned before they go into email headers, so a business name can't add extra recipients.

## 8. After launch

- [ ] **Dependabot**: each Monday, review its pull requests. When CI is green, merge. Prisma and Next.js major versions are excluded on purpose and upgraded by hand.
- [ ] Watch **Vercel → Logs** for errors the first weeks.
- [ ] Rotate `BETTER_AUTH_SECRET` (logs everyone out) and `CRON_SECRET` if they're ever exposed. If the Gmail app password is exposed, delete it in Google and make a new one.
- [ ] Future features (technical plan, section 10): SMS (M10), calendar sync (on hold).

## Local data

- The browser tests use their own database (`teamvory_test`), so test businesses no longer pile up in your local data.
- Practice accounts can be removed from your local database any time:
  `node scripts/remove-practice-data.mjs` (preview), then `node scripts/remove-practice-data.mjs --yes`.
