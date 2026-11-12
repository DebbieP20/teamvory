# TeamVory — Technical Plan

> Brand: **TeamVory**, "Your team, perfectly organized." Brand sheet: `brand/teamvory-brand-sheet.png`.
> Source: *Dynamic Work Schedule Website Application* (requirements document) + client answers (section 7).

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One codebase for the public site, auth, manager app and employee app. Server components keep pages fast. |
| Styling / UI | **Tailwind CSS + shadcn/ui** | Accessible components (dialogs, forms, tables) that look good on phones and desktops. |
| Database | **PostgreSQL** (hosted on Neon or Supabase) | Relational data (businesses → employees → shifts) fits SQL well. |
| ORM | **Prisma** | Type-safe queries and easy migrations. |
| Auth | **Better Auth** (email + password, database sessions) plus our own invitation links | Stable, built-in sign-up, login and password reset. Chosen in M2 instead of Auth.js, whose v5 was still in beta and which discourages passwords. |
| Validation | **Zod** | One schema validates both forms and server actions. |
| Email | **Resend + React Email** | Notification emails built as templates. Free tier is enough for 10 employees. |
| SMS (later) | **Twilio** | Employees already use text messages. Added after v1 through the same notification layer. |
| Exports | **@react-pdf/renderer** (PDF), **satori + resvg** (PNG), **sharp** (JPG), **docx** (Word .docx), **exceljs** (Excel .xlsx) | Covers all five formats the manager asked for. |
| Dates / time zone | **date-fns + date-fns-tz**, zone `America/New_York` | Switches automatically between EDT (summer) and EST (winter). |
| Testing | **Vitest** (unit, especially the scheduler) + **Playwright** (end-to-end) | Covers the testing list in spec section 6. |
| Hosting | **Vercel** (app) + Neon (DB) | Automatic deploys from GitHub. Free plan while building and testing; Vercel's free plan is for non-commercial use only, so a paid plan or another host is chosen before launch (decision 28). |

---

## 2. Project structure

```
teamvory/
├── app/
│   ├── (public)/            # Home, How it works, About, Contact
│   ├── (auth)/              # Sign up, Login, Forgot password, Accept invite
│   ├── manager/             # Dashboard, Employees, Availability, Shifts,
│   │                        #   Schedule, Events, Reports, Settings
│   ├── employee/            # Dashboard, My availability, My schedule,
│   │                        #   Shift requests, Profile
│   └── api/                 # Export downloads
├── components/              # Shared UI (WeekCalendar, ShiftCard, etc.)
├── lib/
│   ├── scheduler/           # Auto-scheduling algorithm (pure TS, unit-tested)
│   ├── auth/                # Session + role guards
│   ├── notifications/       # Channel-agnostic sender (email now, SMS later)
│   └── exports/             # pdf / png / jpg / docx / xlsx generators
├── prisma/schema.prisma
└── docs/
```

---

## 3. Database design

> **Superseded by `database.md`** (full ERD, constraints and indexes). See also `architecture.md` and `permissions.md`. The list below is the original draft.

Every business-owned table has a `businessId`, and every query filters by it. This keeps the data isolated (NFR "Data isolation") and makes multi-business support possible later with no redesign.

```
User            id, email, passwordHash, name, phone, createdAt
Business        id, name, timezone ("America/New_York"), weekStartsOn (MONDAY),
                logoUrl,
                swapApprovalMode (AUTO | MANAGER_APPROVAL),
                openShiftPickup (bool),
                reminderEnabled, reminderStartDay (MON–SUN), reminderDays (1–7),
                reminderIncludeDefaultOnly (bool),
                availabilityDeadlineEnabled (bool, default off),
                availabilityDeadlineDay (MON–SUN), availabilityDeadlineTime ("18:00"),
                timeOffApprovalRequired (bool, default off)
Membership      id, userId, businessId, role (OWNER | MANAGER | EMPLOYEE),
                status (ACTIVE | INACTIVE), schedulingMode,
                schedulingMode (FAIR_SHARE | BACKUP | NOT_SCHEDULED),
                colorTag, maxHoursPerWeek? (optional, unused by default)
Season          id, businessId, name ("Summer 2027"), startDate, endDate
SeasonRoster    seasonId, membershipId — who is working this season
Invitation      id, businessId, email, role, token, expiresAt, acceptedAt

Week            id, businessId, startDate (always a Monday),
                status (CONFIGURING | DRAFT | PUBLISHED)

AvailabilityTemplate  id, membershipId, dayOfWeek, startTime, endTime
                (recurring default availability)
AvailabilityOverride  id, membershipId, weekId, date, startTime?, endTime?,
                type (AVAILABLE | UNAVAILABLE),
                enteredById (the employee themselves OR the manager)
TimeOff         id, membershipId, startDate, endDate, note?,
                enteredById (employee or manager),
                status (PENDING | APPROVED | DECLINED), default APPROVED:
                PENDING only when the business requires approval (decision 30),
                reviewedById?, reviewedAt?

ShiftPattern    id, businessId, name ("Early season", "Mid season"),
                shifts (JSON: [{start:"12:00", end:"17:00", required:2}, ...])
Shift           id, weekId, date, startTime, endTime, requiredCount,
                eventId?, notes

Schedule        id, weekId, version, status (DRAFT | PUBLISHED | SUPERSEDED),
                generatedBy (MANUAL | AUTO), seed?, publishedAt, publishedById
Assignment      id, scheduleId, shiftId, membershipId,
                pinned (bool: placed by hand, kept by Generate/Regenerate),
                override (bool: manager assigned someone marked not available,
                          after agreeing with them; see section 5)
                UNIQUE(scheduleId, shiftId, membershipId)

ShiftRequest    id, assignmentId, requesterId,
                type (SWAP | COVERAGE),
                targetMembershipId?, targetAssignmentId?,
                status (OPEN | PENDING_APPROVAL | COMPLETED | REJECTED | CANCELLED),
                pickedUpById?, reason, resolvedAt

Event           id, businessId, title, date, startTime, endTime,
                location, notes, requiresStaffing (bool),
                (on hold: source, calendarFeedId, externalUid + a CalendarFeed
                 table, only if calendar sync goes ahead; section 6b)

Notification    id, userId, channel (EMAIL | SMS), type,
                dedupeKey UNIQUE, sentAt
AuditLog        id, businessId, actorId, action, entity, before, after, at
```

**How availability is resolved for a given week:** start from the employee's `AvailabilityTemplate`, then apply that week's `AvailabilityOverride` rows, then remove any `TimeOff`. By default there is **no deadline**: employees (or the manager on their behalf) can change availability at any time. A business can turn on a deadline (decision 29, below). Time off counts only when APPROVED; pending time off is treated as unavailable by the auto-scheduler.

### Optional business settings: availability deadline and time-off approval (decisions 29 and 30)

TeamVory is meant for many kinds of businesses, so these two are **settings in Business settings, both off by default**. With both off, everything works exactly as the first client asked (decisions 6 and 9).

**Availability deadline (decision 29).** The owner turns it on and picks a day and time, e.g. *Thursday 6 PM*, for the following week's availability.
- Before the deadline, employees change that week's availability and time off freely.
- After it, that week is **locked for employees**: they see "The deadline has passed. Ask your manager to change it." Managers can still edit for anyone. Changes to the default week only apply to weeks that are still open.
- Availability reminders (decision 26) mention the deadline ("Due Thursday 6 PM"), and the dashboard lists who missed it.

**Time-off approval (decision 30).** The owner turns it on to review time off before it counts.
- Time off an employee adds is saved as **Pending**. Managers see it on the dashboard with **Approve** / **Decline**, and the employee gets an email either way.
- While pending, the auto-scheduler treats those dates as unavailable (the safe choice) and the planning view shows them as *pending time off*. Declined time off is ignored.
- Time off a manager enters for someone is approved automatically. If an employee edits approved time off, it goes back to Pending.
- Turning the setting off approves anything still pending.

**How far ahead (decision 22):** the owner schedules one week at a time, at most two weeks out. So week-by-week changes ("This week") are offered for the **current week and next week only**. Anything further ahead is covered by the default week, or by time off, which can be any future date. Availability is **one time range per day** (decision 21).

**Availability change after publishing:** when someone changes availability for a week that is already published and it conflicts with one of their shifts, the change is still saved. The shift is flagged as a conflict on the manager's dashboard, and the manager gets one notification. The published schedule does **not** change by itself.

**Seasons:** at the start of a season the manager opens a "Season roster" screen and checks who is back. Returning employees become ACTIVE. Everyone else stays INACTIVE, keeping their history and default availability, and can be reactivated in a later season. Inactive employees can't log in to the employee area and are never scheduled.

**Publishing (built in M5):** the manager always works on the week's one draft. **Publish** freezes it into a new numbered version (a snapshot of the shifts, times and people) and marks the previous version SUPERSEDED. The first publish emails everyone who can be scheduled. Later publishes email only the people whose own shifts changed (added, removed or moved), with what changed. The Schedule page shows *Draft*, *Published* or *Unpublished changes for N people*, and asks before publishing shifts that are short or have too many people. Employees see the latest published version on their home page (this week and next week, with who they work with).

**Preventing silent overwrites (NFR "Reliability"):** `Schedule` and `Assignment` rows carry a version number. A save sent with an out-of-date version is rejected and the manager is shown "This schedule changed since you opened it."

---

## 4. Shift configuration

Shifts are usually the **same every day, weekends included: 12–5 PM and 5–9 PM** (decision 23). They change only for unexpected situations, mostly bad weather: on a rainy day the business is slow, so the owner schedules one employee, or works half a day or the whole day himself. Times can also still change during the season. So:

- The manager saves named **Shift patterns**, for example:
  - *Standard* (the default): 12:00–17:00 ×2, 17:00–21:00 ×2
  - *Slow day* (rain, bad weather): 12:00–17:00 ×1, 17:00–21:00 ×1
  - Others if the season calls for it (e.g. 14:00–17:00 / 17:00–20:00)
- When setting up a week, the manager either **copies last week** (the default, one click) or **applies a pattern** to some or all days, then edits single days as needed.
- Editing one day never changes the others or the saved pattern (the spec rule "changes to an individual day shall not unintentionally modify other days").
- **A slow day after publishing:** if rain is forecast for a day that's already published, the manager applies *Slow day* to that day, removes the extra people on the Schedule page and publishes again. Only the employees whose shifts changed get an email. The owner can put himself on one shift (half day) or both (whole day) like any other week.

---

## 5. Auto-scheduling algorithm

A pure TypeScript function, kept separate from the UI so it is easy to test:

```
generateSchedule(shifts, employees, availability, rules, seed) → {
  assignments, unfilledShifts, warnings, hoursByEmployee, targetByEmployee
}
```

**The owner works shifts too** (client decision 19). Each person has a *scheduling mode*:
- **Fair share** (employees): gets a share of the hours in proportion to their availability.
- **Backup** (the owner, by default): not part of the fair split. He picks his own shifts each week and is the fallback for any shift nobody else can cover.
- **Not scheduled**: never given shifts (for example a manager who doesn't work the floor).

The owner's default availability is every shift, every day, so he only marks the days he takes off (time off or a weekly exception). A "half day" for him is one of the day's shifts, e.g. only 2–5 or only 5–9, since each is its own shift.

**Hard rules (the auto-scheduler never breaks these):**
1. Only assign an employee who is available for the **entire** shift.
2. No overlapping shifts for the same person.
3. No one is assigned twice to the same shift.
4. Inactive employees and time off are excluded.

**Manager override (decision 20):** rules 1 and 4 (time off) are hard rules for the auto-scheduler only. When assigning by hand, the manager *can* add someone who marked themselves not available, for the special case where they called the employee and agreed on it. The app asks first ("Ben marked himself not available Thu 5–9 PM. Only add him if you've agreed. Assign anyway?"). The assignment is saved with `override = true`, shown with an *agreed* tag, recorded in the audit log, and not flagged as a conflict afterwards. Rules 2 and 3 (overlaps, double booking) and inactive employees are never overridable.

**Fairness = proportional to availability** (client decision):

```
eligibleHours(e) = total hours of this week's shifts that e is available for
target(e)        = totalHoursNeeded × eligibleHours(e) / Σ eligibleHours(all)
```

For example, if Ana can cover 30 hours of shifts and Ben only 15, Ana's target is about twice Ben's. A target is never more than what the person can actually work.

Only *fair share* people are counted in `eligibleHours` and `target`, and `totalHoursNeeded` excludes the slots already pinned (for example the shifts the owner put himself on).

**Steps:**
0. Keep every **pinned** assignment (the owner's own shifts, or anything placed by hand and pinned). Generate and Regenerate never move them.
1. Compute `target(e)` for everyone in *fair share* mode.
2. Sort shift slots by difficulty (fewest available people first), so hard-to-fill shifts get filled before the easy ones use everyone up.
3. For each slot, choose the eligible employee with the largest **gap** between `target(e)` and the hours assigned so far. Break ties randomly using `seed`, which is how **Regenerate** gives a different but equally fair schedule.
4. Improvement pass: swap pairs of assignments whenever that moves people closer to their targets.
5. **Owner fills the gaps:** any slot still empty goes to the *backup* person (the owner) if he is available and not already on an overlapping shift. These are labelled "Owner covering" in the draft so he can see why he was added.
6. Return the shifts that are still unfilled ("Tue 17:00–21:00 needs 1 more, nobody available, owner already working"), and each person's hours compared with their target.

Typical size (about 10 people, 4 shifts × 7 days = 28 shifts, 56 slots) runs in a few milliseconds.

**As built (M6):** `lib/scheduler.ts` (`generateSchedule`, `fairTargets`), unit tested in `lib/scheduler.test.ts`.
- Anything placed **by hand is pinned automatically** (including the owner's own shifts and agreed exceptions), so **Build schedule** never undoes the manager's choices. Unpinning a shift lets Regenerate change it.
- **Build schedule** / **Regenerate** keep pinned shifts and replace the rest. Each run uses a new random seed (saved on the draft), so Regenerate gives a different but equally fair mix.
- The improvement pass (step 4) moves single generated shifts to someone else whenever that lowers the total squared distance from everyone's target.
- The Schedule page shows each person's hours against their fair share (bar and line), and the Assign list puts the people furthest below their fair share first.

---

## 6. Shift swaps, coverage and open shifts

The manager chooses one setting in **Business settings → Swap approval**:
- **Automatic**: an eligible swap or pickup completes immediately.
- **Manager approval**: it goes to `PENDING_APPROVAL` and the manager approves it with one click.

Two request types:
- **Swap** (trade shifts with a specific person): the other employee must accept, because their own shift changes too.
- **Coverage / open shift**: the employee posts their shift as open. Every eligible employee (available, no overlap, active) sees it in **Open shifts** and can **pick it up with no further acceptance**. The first valid pickup wins, enforced with a database transaction so two people can't take the same shift.

Until someone picks up the shift, the original employee is still assigned and still responsible. The manager sees open shifts on the dashboard, especially ones within 24 hours.

After completion, hours totals update and everyone involved gets a notification.

**As built (M7):**
- Employees open a shift from **My schedule → Can't make it?** and either **ask a coworker to swap** (only coworker shifts that work for both are listed, same week) or **post it as an open shift** (everyone who can work it gets an email). Requests are listed under **Shifts**, with Pick up, Accept/Decline and Cancel.
- Swap approval is a setting, **Automatic** by default. With **Manager approves**, accepted swaps and pickups wait on the dashboard with Approve/Decline.
- Completing a request claims it first (a guarded update in a transaction), so two people can't take the same shift. It then creates a new published version with the change (the change is on record), and makes the same change in the draft (pinned) so the manager's next publish doesn't undo it.
- Every step re-checks the rules against the published schedule as it is now. If it changed underneath (re-published, shift started, availability changed), the request is closed with the reason.
- The dashboard lists open shifts (red when they start within 24 hours) and approvals. Only employees swap and pick up; the owner and managers change the schedule directly.

---

## 6a. Events and exports (built in M8)

- **Events** (`/manager/events`): title, date, times, location, notes and *Needs extra staff*. They show under their day on the Shifts and Schedule pages and on the dashboard (next two weeks), flagged "No shift added yet" until a staffing shift exists. **Add a shift for it** creates a shift at the event's times, linked to the event (decision 16), for this week or next. The shift is labelled with the event everywhere, including the employee's My schedule and the published copy. Deleting an event keeps its shifts.
- **Reports** (`/manager/reports`): hours per person for this week, next week and the last 12 weeks, plus downloads. Exports use the published version when there is one (what the team saw), otherwise the draft, labelled as such.
- **Downloads** (`/api/exports/{pdf|png|jpg|docx|xlsx}?week=YYYY-MM-DD`, managers only): PDF with @react-pdf/renderer, PNG drawn with satori (DM Sans) and resvg, JPG with sharp, Word with docx, Excel with exceljs (Schedule, Hours and Events sheets). Empty spots show as "N needed".

## 6b. Availability reminders (and calendar sync, on hold)

### Availability reminders (decision 26)

In **Settings → Availability reminders** the owner chooses:
- **Start day** (e.g. Wednesday) and **how many days in a row** to send it (e.g. 2 → Wednesday and Thursday)
- On/off

Reminders go out with the **daily morning job** (around 9 AM Eastern), so there's no time-of-day setting.

Each reminder day, an email goes to **active employees who haven't set their availability for next week**. "Set" means they have a default week saved or have entered changes for next week. People who already have it get nothing, and the reminder stops for a person as soon as they enter it (so day 2 only reaches whoever is still missing). One extra option, off by default: *also remind people who only use their default week, to check it's still right*.

This is only a nudge. If the business has turned on an availability deadline (decision 29), the reminder says when it's due. Each send is saved in the notification outbox with a `dedupeKey` like `avail-reminder:{weekStart}:{userId}:{date}`, so nobody gets the same reminder twice. The dashboard's "who hasn't updated availability" list uses the same rule.

### Importing events from the owner's phone calendar (decision 27, ON HOLD)

> **On hold** until the client decides (pros and cons to be discussed). Not part of any milestone yet. The design below is kept so it can be added later without changes to the rest of the app.

So the owner doesn't type each event twice, TeamVory **reads events from his Apple (or Google) Calendar**:

1. In Apple Calendar he makes a calendar just for business events (e.g. "TeamVory events") and turns on **Public Calendar** to get its link (`webcal://…`). Google Calendar has the same thing: the calendar's *secret address in iCal format*.
2. He pastes the link into **Settings → Calendar sync**.
3. TeamVory checks the link **once a day**, plus **whenever the owner opens the Dashboard or Events page** (if it's been more than a few minutes) and when he taps **Sync now**. New events appear in *Events* and on the dashboard, tagged *From calendar*. Edited or deleted events are updated too, matched by the event's unique ID (`externalUid`).
4. As before, he adds the staffing shifts for an event by hand (decision 16). The dashboard flags events with no shift yet.

Notes:
- It's **one-way** (calendar → TeamVory). Events are edited in the phone calendar, and are read-only in TeamVory.
- Only that one calendar is read, so personal appointments never reach TeamVory. The link is stored encrypted. Anyone who has the link can see that calendar, which is another reason to keep it business-only.
- Logging TeamVory into his iCloud account (CalDAV with an app-specific password) would also work, but means storing an Apple password. The calendar link is simpler and safer.
- Reading the link uses the `node-ical` package (an iCal parser), which also handles repeating events.

### Scheduled jobs

One **Vercel Cron job runs once a day in the morning** (`/api/cron/daily`, protected by a secret). It sends that day's availability reminders and retries failed emails (and would also sync calendars, if calendar sync goes ahead). This fits Vercel's free plan, which only allows daily jobs and may start them any time within the chosen hour. Hourly jobs aren't needed (decision 28).

---

## 7. Client decisions (confirmed)

| # | Topic | Decision |
|---|---|---|
| 1 | Fairness | Hours **proportional to availability** |
| 2 | Shift rules | No fixed min/max hours. Shift times and staffing change by month, set by the owner → **shift patterns** (section 4) |
| 3 | Positions | None. Any employee can work any shift |
| 4 | Seniority | None |
| 5 | Legal / overtime limits | None |
| 6 | Availability deadline | **No deadline** for this client. Employees can update any time, with no extra steps for the manager. Other businesses can turn on a deadline (decision 29) |
| 7 | Recurring availability | Yes. Default weekly availability plus per-week exceptions |
| 8 | Manager enters for employee | Yes, alongside employees entering their own |
| 9 | Time off | Separate from weekly availability. **No approval** for this client: the employee adds it to the calendar and the manager sees it. Other businesses can require approval (decision 30) |
| 10 | Swap approval | Manager setting: automatic or manager approval |
| 11 | Open shifts | Any eligible employee can pick up with no acceptance step, and no time limit before the shift starts |
| 12 | Exports | **PDF, PNG, JPG, Word (.docx), Excel (.xlsx)** |
| 13 | SMS | Yes, after v1 |
| 14 | Week / time zone | Week starts **Monday**; Eastern Time (`America/New_York`, handles EDT/EST) |
| 15 | Seasonal staff | Inactive between seasons; returning staff reactivated, others stay inactive |
| 16 | Event staffing | Manager adds shifts by hand |
| 17 | Brand | **TeamVory**, tagline "Your team, perfectly organized." Colors below |
| 18 | Contact page | Form, with messages emailed to you |
| 19 | Owner on the schedule | **Yes.** The owner schedules himself every week and chooses his own days off. He can work one shift of a day (e.g. 2–5 or 5–9) instead of the whole day. When no employee is available for a shift, the owner covers it (*backup* mode, section 5) |
| 20 | Assigning someone marked not available | **Allowed for the manager, with a confirmation.** Rare: only after the manager and employee agree (e.g. by phone). The auto-scheduler never does it |
| 21 | Time ranges per day | **One** availability range per day |
| 22 | How far ahead | The owner schedules **week by week, at most 2 weeks out**. Employees change availability for this week or next week; the default week covers the rest |
| — | Schedule layout | Grid **by shift** (rows = shifts, columns = days) is the main view; no per-person view needed |
| 23 | Usual shift times | **12–5 PM and 5–9 PM, every day including weekends.** Changes are one-offs, mostly a slow rainy day: one employee, or the owner works half or the whole day (*Slow day* pattern, section 4) |
| 24 | Sign-up | **Any business can sign up on its own** from the public site. The Contact page stays for questions and support |
| 25 | Pricing | **Per business, per month.** Price not decided yet, so no prices on the site in v1 (see section 10) |
| 26 | Availability reminders | Owner picks the start day and number of days in a row; sent each morning with the daily job. Sent only to employees who haven't set availability for next week (section 6b) |
| 27 | Calendar sync | **On hold**: the owner will discuss pros and cons with the client first. Design kept in section 6b; not in any milestone |
| 28 | Hosting and cost | **Build and test on free plans** (Vercel Hobby, Neon free). Scheduled jobs run once a day, so no paid plan is needed for features. Vercel's free plan doesn't allow commercial use, so **before launch (M9)** choose Vercel Pro (~$20/month) or another host whose free plan allows it, and include hosting in the monthly price. SMS stays after v1 (Twilio charges per message) |
| 29 | Availability deadline setting | **Optional, off by default.** Owner picks a day and time; after it, that week is locked for employees and only managers can change it (section 3) |
| 30 | Time-off approval setting | **Optional, off by default.** When on, employee time off is *Pending* until a manager approves or declines it (section 3) |

**Brand colors** (from the brand sheet)

| Token | Hex | Use |
|---|---|---|
| Deep Navy | `#0B1F44` | Text, headers, dark backgrounds |
| Teal Accent | `#14B8A6` | Buttons, links, highlights (on navy or as fills; for small text on white use a darker teal such as `#0F766E` to meet contrast) |
| Soft Gray | `#E2E8F0` | Borders, dividers, quiet backgrounds |
| Mint Tint | `#E6FFFA` | Selected states, soft highlight panels |

**Fonts:** Poppins SemiBold for the logo and headings, DM Sans for body text and the app interface (both free on Google Fonts).

**Logo files:** redrawn as vector files from the brand sheet. See `brand/README.md` for the full list and where each file is used.

**Still open**
- **Contact email/phone and social links.** On hold until the client has created them; they'll be sent over when ready. The Contact page form is built anyway, and the details live in one config file (`lib/site-config.ts`), so adding them later takes one edit.

---

## 8. Pages

| # | Page | Route |
|---|---|---|
| 1–4 | Home, How it works, About us, Contact | `/`, `/how-it-works`, `/about`, `/contact` |
| — | Privacy Policy, Terms | `/privacy`, `/terms` |
| 5–7 | Sign up, Log in, Password recovery | `/signup`, `/login`, `/forgot-password` |
| — | Accept invitation | `/invite/[token]` |
| 8 | Manager dashboard (conflicts, open shifts, who hasn't updated availability, events) | `/manager` |
| 9 | Employees + season roster | `/manager/employees` |
| 10 | Availability overview (+ edit on behalf, time-off calendar) | `/manager/availability?week=` |
| — | Shift configuration + patterns | `/manager/shifts?week=` |
| 11 | Weekly schedule (manual + auto) | `/manager/schedule?week=` |
| 12 | Events | `/manager/events` |
| 13 | Reports & exports (PDF/PNG/JPG/Word/Excel) | `/manager/reports` |
| 14 | Business settings (swap approval, availability reminders, time zone) | `/manager/settings` |
| 15 | Employee dashboard | `/employee` |
| 16 | My availability (default + this week + time off) | `/employee/availability` |
| 17 | My schedule | `/employee/schedule` |
| 18 | Shift requests + Open shifts | `/employee/requests` |
| 19 | My profile | `/employee/profile` |

---

## 9. Milestones

| # | Milestone | Deliverable |
|---|---|---|
| **M0** | Setup | Repo, Next.js, Tailwind, Prisma, DB, CI, deploy preview |
| **M1** | Public website | Home, How it works, About, Contact form (emailed to you), Privacy/Terms, TeamVory brand |
| **M2** | Accounts | Sign up → create business, login, password reset, invite employees, role guards, active/inactive |
| **M3** | Availability | Recurring default + weekly exceptions, manager edits on behalf, time off, manager overview, **optional availability deadline and time-off approval** |
| **M4** | Shift config + manual schedule | Shift patterns, copy previous week, click to assign, hours totals, conflict alerts |
| **M5** | Publish + notifications | Publish/version schedules, email on publish/change, employee "My schedule", post-publish conflict flags, **availability reminders** (daily job) |
| **M6** | Auto-scheduler | Proportional-fairness algorithm + tests, generate/regenerate, unfilled-shift report |
| **M7** | Swaps & open shifts | Swaps, open-shift pickup, approval-mode setting, emails |
| **M8** | Events + reports/exports | Events in planning view; PDF/PNG/JPG/Word/Excel exports |
| **M9** | Polish & launch | Seasons/roster screen, accessibility audit, mobile testing, client testing, **choose production hosting (decision 28)**, deploy, handover docs |
| **M10** | SMS (post-v1) | Twilio channel for the notifications that already exist; per-user preference for email/SMS |

M1–M5 already replace the current Excel + text-message process. M6 and later make it faster.

---

## 10. Future features (after v1)

Not needed by the first client, but likely once TeamVory is offered to more and larger businesses. The database already leaves room for each of them (every record belongs to a business, and roles live on the membership), so none needs a redesign.

| Feature | What it adds | Why it may be needed |
|---|---|---|
| **Positions** | Tag employees and shifts with a position (cook, cashier, server…). Only people trained for a position get those shifts | Medium businesses rarely have "anyone can work any shift" |
| **Multiple locations** | One business, several sites, each with its own shifts and staff (people can work at more than one) | Chains and businesses with a second site |
| **More managers** | Already supported (the owner promotes managers). Later: limit a manager to certain locations or positions | Larger teams split the scheduling work |
| **Pricing page + subscription billing** | Monthly price **per business** (decision 25), card payments (e.g. Stripe), free trial | Needed before charging new businesses; the price isn't set yet |
| **Calendar sync (owner's calendar → Events)** | Events added in the owner's Apple or Google Calendar appear in TeamVory automatically (design in section 6b) | **On hold** until discussed with the client (decision 27) |
| **Calendar feed for staff** | Each person gets a private calendar link so their shifts show up in Apple / Google Calendar automatically | The other direction of decision 27; employees see shifts without opening the app |
| **SMS** | Already planned as M10 | Some staff don't read email |
