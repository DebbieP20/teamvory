# Database design (ERD)

> Phase 5: Technical design. PostgreSQL with Prisma. Replaces the draft table list in `technical-plan.md` §3.

## 1. Diagram

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : "belongs to businesses via"
    BUSINESS ||--o{ MEMBERSHIP : has
    BUSINESS ||--o{ INVITATION : sends
    BUSINESS ||--o{ SEASON : has
    SEASON ||--o{ SEASON_MEMBER : includes
    MEMBERSHIP ||--o{ SEASON_MEMBER : "works in"

    MEMBERSHIP ||--o{ AVAILABILITY_TEMPLATE : "default week"
    MEMBERSHIP ||--o{ AVAILABILITY_OVERRIDE : "weekly changes"
    MEMBERSHIP ||--o{ TIME_OFF : takes

    BUSINESS ||--o{ SHIFT_PATTERN : saves
    BUSINESS ||--o{ WEEK : plans
    WEEK ||--o{ SHIFT : contains
    BUSINESS ||--o{ EVENT : holds
    EVENT |o--o{ SHIFT : "staffed by"

    WEEK ||--o{ SCHEDULE : "has versions"
    SCHEDULE ||--o{ ASSIGNMENT : contains
    SHIFT ||--o{ ASSIGNMENT : "filled by"
    MEMBERSHIP ||--o{ ASSIGNMENT : works

    ASSIGNMENT ||--o{ SHIFT_REQUEST : "subject of"
    MEMBERSHIP ||--o{ SHIFT_REQUEST : requests

    USER ||--o{ NOTIFICATION : receives
    BUSINESS ||--o{ AUDIT_LOG : records
    USER ||--o{ PASSWORD_RESET_TOKEN : requests

    USER {
        uuid id PK
        string email UK
        string name
        string phone "optional"
        string passwordHash
        enum notifyBy "EMAIL or SMS"
        datetime createdAt
    }
    BUSINESS {
        uuid id PK
        string name
        string timezone "America/New_York"
        enum weekStartsOn "MONDAY"
        enum swapApprovalMode "AUTO or MANAGER"
        boolean reminderEnabled
        enum reminderStartDay "MON to SUN"
        int reminderDays "days in a row"
        boolean reminderIncludeDefaultOnly
        datetime createdAt
    }
    MEMBERSHIP {
        uuid id PK
        uuid userId FK
        uuid businessId FK
        enum role "OWNER, MANAGER, EMPLOYEE"
        enum status "INVITED, ACTIVE, INACTIVE"
        enum schedulingMode "FAIR_SHARE, BACKUP, NOT_SCHEDULED"
        string colorTag
        int maxHoursPerWeek "optional"
    }
    INVITATION {
        uuid id PK
        uuid businessId FK
        string email
        enum role
        string tokenHash UK
        uuid invitedById FK
        datetime expiresAt
        datetime acceptedAt "optional"
    }
    SEASON {
        uuid id PK
        uuid businessId FK
        string name "Summer 2027"
        date startDate
        date endDate
    }
    SEASON_MEMBER {
        uuid seasonId PK, FK
        uuid membershipId PK, FK
    }
    AVAILABILITY_TEMPLATE {
        uuid id PK
        uuid membershipId FK
        int dayOfWeek "1 Mon to 7 Sun"
        time startTime
        time endTime
    }
    AVAILABILITY_OVERRIDE {
        uuid id PK
        uuid membershipId FK
        date date
        enum type "AVAILABLE or UNAVAILABLE"
        time startTime "optional"
        time endTime "optional"
        uuid enteredById FK "employee or manager"
        datetime updatedAt
    }
    TIME_OFF {
        uuid id PK
        uuid membershipId FK
        date startDate
        date endDate
        string note "optional"
        uuid enteredById FK
    }
    SHIFT_PATTERN {
        uuid id PK
        uuid businessId FK
        string name "Early season"
        json shifts "start, end, people needed"
    }
    WEEK {
        uuid id PK
        uuid businessId FK
        date startDate "a Monday"
        enum status "CONFIGURING, DRAFT, PUBLISHED"
    }
    SHIFT {
        uuid id PK
        uuid weekId FK
        date date
        time startTime
        time endTime
        int requiredCount
        uuid eventId FK "optional"
        string notes "optional"
    }
    EVENT {
        uuid id PK
        uuid businessId FK
        string title
        date date
        time startTime
        time endTime
        string location
        string notes
        boolean requiresStaffing
    }
    SCHEDULE {
        uuid id PK
        uuid weekId FK
        int version
        enum status "DRAFT, PUBLISHED, SUPERSEDED"
        enum generatedBy "MANUAL or AUTO"
        int seed "optional"
        int lockVersion
        datetime publishedAt "optional"
        uuid publishedById FK "optional"
    }
    ASSIGNMENT {
        uuid id PK
        uuid scheduleId FK
        uuid shiftId FK
        uuid membershipId FK
        boolean pinned "kept by Generate"
        boolean override "assigned though marked not available"
    }
    SHIFT_REQUEST {
        uuid id PK
        uuid businessId FK
        enum type "SWAP or COVERAGE"
        uuid requesterId FK
        uuid assignmentId FK
        uuid targetAssignmentId FK "swap only"
        uuid pickedUpById FK "coverage only"
        enum status "OPEN, PENDING_APPROVAL, COMPLETED, REJECTED, CANCELLED"
        datetime createdAt
        datetime resolvedAt "optional"
    }
    NOTIFICATION {
        uuid id PK
        uuid userId FK
        uuid businessId FK
        enum channel "EMAIL or SMS"
        string type
        string dedupeKey UK
        json payload
        enum status "PENDING, SENT, FAILED"
        int attempts
        datetime sentAt "optional"
    }
    AUDIT_LOG {
        uuid id PK
        uuid businessId FK
        uuid actorId FK
        string action
        string entityType
        uuid entityId
        json before
        json after
        datetime createdAt
    }
    PASSWORD_RESET_TOKEN {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        datetime expiresAt
        datetime usedAt "optional"
    }
    CONTACT_MESSAGE {
        uuid id PK
        string name
        string email
        string message
        datetime createdAt
    }
```

`CONTACT_MESSAGE` belongs to the public website, not to a business. It's saved as a backup of the email sent to the site owner.

## 2. Why it's shaped this way

| Choice | Reason |
|---|---|
| **User** and **Membership** are separate | One person (one login) could later work for two businesses that both use TeamVory. Role and active/inactive status belong to the membership, not the person |
| `schedulingMode` on Membership | The owner works shifts too. Employees are *fair share*; the owner is *backup* by default: he picks his own shifts and covers whatever nobody else can (decision 19). *Not scheduled* is for managers who don't work shifts |
| `override` on Assignment | The manager may add someone who marked themselves not available, after agreeing with them (decision 20). The flag shows the *agreed* tag and stops it being reported as a conflict |
| Reminder settings on **Business** | One set of reminder choices per business (decision 26). Who gets reminded is worked out when sending, not stored |
| *(On hold)* **CalendarFeed** + `externalUid` on Event | Only if calendar sync goes ahead (decision 27): events imported from the owner's phone calendar. The calendar's own event ID matches updates and deletions, so re-syncing never creates duplicates. Unique (`calendarFeedId`, `externalUid`) |
| `pinned` on Assignment | Shifts the owner puts himself on (or any shift placed by hand and pinned) survive Generate and Regenerate |
| Availability = **template + overrides** | The default week is entered once; each week only stores the days that differ (decision 7) |
| Overrides keyed by **date**, not by week | Availability can be entered for any future week before that week is set up |
| **TimeOff** has no status | No approval needed for this client (decision 9) |
| **Week → Shift** separate from **Schedule → Assignment** | Shift setup (what's needed) stays fixed while the manager regenerates schedules (who works). The spec requires regenerating "without changing the underlying shift configuration" |
| **Schedule versions** | Publishing again creates a new version; the old one becomes SUPERSEDED and stays in history. Exports can pick any version |
| No `hours` column on Assignment | Hours come from the shift's start and end, so they can't get out of sync |
| **ShiftPattern** stores shifts as JSON | Patterns are only templates; they're copied into real Shift rows when applied, so editing a pattern never changes past weeks |
| `businessId` on top-level tables | Every query can filter by business (data isolation, future multi-business support) |

## 3. Rules the database enforces

| Rule | How |
|---|---|
| One membership per person per business | Unique (`userId`, `businessId`) |
| One week record per Monday | Unique (`businessId`, `startDate`) |
| No double-booking the same person on the same shift | Unique (`scheduleId`, `shiftId`, `membershipId`) on Assignment |
| Only one draft and one published schedule per week | Partial unique indexes on (`weekId`) where `status = 'DRAFT'` and where `status = 'PUBLISHED'` |
| Shift times make sense | Check: `endTime > startTime`, `requiredCount >= 1` |
| Time off dates make sense | Check: `endDate >= startDate` |
| No duplicate emails | Unique `dedupeKey` on Notification, e.g. `publish:{scheduleId}:{userId}` |
| Overlapping shifts for one person | Checked in the service layer (needs time comparison across rows) and re-checked inside the swap/pickup transaction |

## 4. Indexes for common screens

| Screen | Index |
|---|---|
| Availability overview for a week | AvailabilityOverride (`membershipId`, `date`); TimeOff (`membershipId`, `startDate`, `endDate`) |
| Weekly schedule | Shift (`weekId`, `date`); Assignment (`scheduleId`); Assignment (`membershipId`) |
| Employee dashboard / My schedule | Assignment (`membershipId`) joined to the published schedule |
| Open shifts list | ShiftRequest (`businessId`, `status`) |
| Notification retry job | Notification (`status`, `attempts`) |

## 5. Deleting data

- Employees are never deleted, only set to INACTIVE, so past schedules and hour reports stay correct.
- Events, shift patterns and draft schedules can be deleted.
- Published schedules are never deleted; they become SUPERSEDED.
- If someone asks for their personal data to be removed, their name, email and phone are anonymized and the shifts they worked are kept.
