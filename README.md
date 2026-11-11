# TeamVory

*Your team, perfectly organized.*

TeamVory is a web app for employee scheduling in small, medium and seasonal businesses. Employees enter their availability once, on their phone. The owner builds a fair weekly schedule in minutes, either by assigning shifts by hand or by clicking **Generate**. Then they publish it, and everyone gets an email.

It replaces the usual routine of collecting availability by text message, typing it into Excel and building the schedule cell by cell.

## Status

🟡 **M3: availability in progress.** M0–M2 (setup, public website, accounts) are done.

| Milestone | | Status |
|---|---|---|
| Plan | Requirements, architecture, database, permissions, user flows | ✅ Done |
| Wireframes | Seven key screens, clickable | ✅ Done |
| M0 | Project setup | ✅ Done |
| M1 | Public website | ✅ Done |
| M2 | Accounts (sign up, log in, invitations, roles) | ✅ Done |
| M3 | Availability (default week, weekly changes, time off) | 🚧 In progress |
| M4 | Shift setup and manual scheduling | |
| M5 | Publishing, email and availability reminders | |
| M6 | Auto-scheduler | |
| M7 | Swaps and open shifts | |
| M8 | Events and exports (PDF, PNG, JPG, Word, Excel) | |
| M9 | Polish and launch | |
| M10 | SMS notifications | |

## Main features

- **Fair auto-scheduling.** Hours are shared in proportion to each person's availability. **Regenerate** gives a different but equally fair schedule.
- **Owner as backup.** The owner picks their own shifts and automatically covers any shift nobody else can work.
- **Availability.** A default week, changes for one week only, and time off with no approval step.
- **Seasonal shift patterns.** Shift times change with the season (for example *Early*, *Mid* and *Late season*). Setting up a week takes one click.
- **Swaps and open shifts.** Employees trade shifts or pick up open ones, with optional manager approval.
- **Availability reminders.** Emails on the days the owner picks, only to employees who haven't added next week's availability.
- **Exports.** PDF, PNG, JPG, Word and Excel.

Future features (positions, multiple locations, billing, calendar sync and more) are listed in the [technical plan](docs/technical-plan.md#10-future-features-after-v1).

## Planned stack

Next.js + TypeScript · Tailwind CSS + shadcn/ui · PostgreSQL + Prisma · Better Auth · Resend (email) · Vitest + Playwright · Vercel + Neon

## Run it locally

You need [Node.js](https://nodejs.org/) 22 or later and [PostgreSQL](https://www.postgresql.org/) 16.

**One-time database setup** (Ubuntu / WSL):

```bash
sudo apt-get install -y postgresql && sudo service postgresql start
sudo -u postgres psql -c "CREATE ROLE teamvory LOGIN PASSWORD 'teamvory' CREATEDB;"
sudo -u postgres createdb -O teamvory teamvory
```

**Then:**

```bash
cp .env.example .env # and set DATABASE_URL (the local value is in the file)
npm install          # install dependencies (also generates the Prisma client)
npm run dev          # start the app at http://localhost:3000
```

Check that the app can reach the database at http://localhost:3000/api/health.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run lint` | Check code style |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply database changes (Prisma Migrate) |
| `npm run db:studio` | Browse the database in a web page (Prisma Studio) |
| `npm run test:e2e` | Browser tests on desktop and phone sizes (Playwright; run `npm run build` first) |

GitHub Actions runs all of these on every pull request.

## Documentation

| Document | What's in it |
|---|---|
| [Technical plan](docs/technical-plan.md) | Stack, data model, scheduling algorithm, decisions and milestones |
| [Architecture](docs/architecture.md) | How the system is put together |
| [Database](docs/database.md) | Tables and relationships (ERD) |
| [Permissions](docs/permissions.md) | What owners, managers and employees can do |
| [User flows](docs/user-flows.md) | Step-by-step flows for each task |
| [Sitemap](docs/sitemap.md) | Every page in the app |
| [Plan overview](docs/teamvory-plan.html) | One-page visual summary (download and open in a browser) |
| [Wireframes](docs/wireframes/index.html) | Clickable wireframes (download and open in a browser) |
| [Brand](brand/README.md) | Logo files, colors and fonts |
