# User flows

> Phase 4 — Information architecture. Flows 1, 2 and 5 replace the ones in the requirements document; the rest are new. All follow the client decisions in `technical-plan.md` §7.
>
> **Shape key:** rounded = start/end · rectangle = step · diamond = decision · hexagon = the system acts automatically.

| # | Flow | Who | Status |
|---|---|---|---|
| 1 | Build and publish the weekly schedule | Manager | Updated |
| 2 | Join and set availability | Employee | Updated (deadline removed) |
| 3 | Enter availability for an employee | Manager | New |
| 4 | Add time off | Employee | New |
| 5 | Swap a shift with a coworker | Employee | Updated |
| 6 | Post and pick up an open shift | Employee | New |
| 7 | Availability changes after publishing | Employee → Manager | New |
| 8 | Start a new season | Manager | New |

---

## 1. Build and publish the weekly schedule

```mermaid
flowchart TD
    S(["Manager logs in"]) --> D["Dashboard"]
    D --> W["Select week (Mon–Sun)"]
    W --> SC{"Shifts already set up for this week?"}
    SC -->|Yes| AV
    SC -->|No| HOW{"How to set up shifts?"}
    HOW -->|Copy last week| CP["Copy last week's shifts"]
    HOW -->|Use a pattern| PT["Apply pattern to chosen days<br/>(e.g. Mid season: 2–5 ×2, 5–9 ×2)"]
    HOW -->|From scratch| MN["Add shifts by hand"]
    CP --> ED["Edit single days if needed<br/>(other days unchanged)"]
    PT --> ED
    MN --> ED
    ED --> EV["Add shifts for staffed events, if any"]
    EV --> SV["Save shift setup"]
    SV --> AV["Review availability<br/>(see who hasn't updated)"]
    AV --> MISS{"Anyone missing availability?"}
    MISS -->|Yes| ON["Enter it for them (Flow 3)<br/>or use their default week"]
    MISS -->|No| BLD
    ON --> BLD{"Build how?"}
    BLD -->|Automatically| GEN{{"Generate: fill hardest shifts first,<br/>fairness = proportional to availability"}}
    BLD -->|By hand| HAND["Assign people to shifts"]
    GEN --> RV["Review draft:<br/>hours vs fair target, unfilled shifts, conflicts"]
    HAND --> RV
    RV --> OK{"Problems or not happy?"}
    OK -->|Try another version| GEN
    OK -->|Fix by hand| HAND
    OK -->|Looks good| PUBQ{"Week already published?"}
    PUBQ -->|No| PUB["Publish"]
    PUBQ -->|Yes| CONF{"Confirm replacing the<br/>published schedule?"}
    CONF -->|No| RV
    CONF -->|Yes| PUB2["Publish as new version<br/>(old version kept in history)"]
    PUB --> NOTE{{"Email everyone with shifts this week"}}
    PUB2 --> NOTE2{{"Email only people whose shifts changed"}}
    NOTE --> E(["Done"])
    NOTE2 --> E
```

**Notes**
- "Try another version" regenerates with the same shifts and availability, so the manager can compare options.
- Regenerating never touches a published schedule until the manager confirms (requirement in the spec).

---

## 2. Join and set availability (employee)

```mermaid
flowchart TD
    S(["Employee gets invitation email"]) --> L["Open link, set name + password"]
    L --> FIRST["First login: set default week<br/>(e.g. Mon–Fri 12–9, Sat off)"]
    FIRST --> DONE1(["Default saved; used every week"])

    W(["Any later week"]) --> MA["Open My availability → choose week"]
    MA --> CH{"Different from my default?"}
    CH -->|No| KEEP(["Nothing to do, default applies"])
    CH -->|Yes| EX["Edit only the days that change<br/>(available hours or unavailable all day)"]
    EX --> SAVE{{"Save immediately, no deadline"}}
    SAVE --> PUBQ{"Is that week already published<br/>and does it conflict with my shifts?"}
    PUBQ -->|No| OK(["Manager sees the update"])
    PUBQ -->|Yes| FL["Go to Flow 7"]
```

**Changes from the original flow:** the *"Is the deadline still open?"* decision and the *"request an exception"* branch are removed (decision 6). Recurring default availability is added (decision 7).

---

## 3. Enter availability for an employee (manager)

```mermaid
flowchart TD
    S(["Employee texts the manager<br/>their availability"]) --> O["Manager opens Availability → week"]
    O --> P["Select the employee"]
    P --> E["Edit their days for this week<br/>or their default week"]
    E --> SV{{"Save, marked as<br/>'entered by manager'"}}
    SV --> N{{"Employee gets a short email:<br/>'Your availability was updated'"}}
    N --> F(["Done"])
```

**Why:** it eases the move away from text messages. Employees can still edit their own availability at any time.

---

## 4. Add time off

```mermaid
flowchart TD
    S(["Employee opens My availability → Time off"]) --> CAL["Select dates on the calendar<br/>(one day, several days or whole weeks)"]
    CAL --> NOTE["Add an optional note<br/>(e.g. 'Family trip')"]
    NOTE --> SV{{"Saved immediately, no approval needed"}}
    SV --> SHOW{{"Shown on the manager's availability view<br/>and dashboard ('Upcoming time off')"}}
    SHOW --> EX{{"Never scheduled automatically on those dates.<br/>The manager can only add them by hand after<br/>agreeing with them (override, decision 20)"}}
    EX --> PQ{"Does it overlap a published shift?"}
    PQ -->|No| E(["Done"])
    PQ -->|Yes| CF["Go to Flow 7<br/>(conflict flagged for the manager)"]
    CF --> E
    S -.->|Plans change| ED(["Edit or delete time off at any time"])
```

**Notes**
- Time off doesn't need manager approval for this client. The employee adds it to the calendar, and the manager sees which days or weeks that person can't work.
- The manager can also add time off for an employee, the same way they enter availability for them (Flow 3).

---

## 5. Swap a shift with a coworker

```mermaid
flowchart TD
    S(["Employee opens My schedule"]) --> PK["Choose my shift"]
    PK --> CW["Choose a coworker's shift to trade"]
    CW --> CHK{{"System checks both people:<br/>available, no overlap, active"}}
    CHK --> EL{"Eligible?"}
    EL -->|No| WHY(["Explain why<br/>(e.g. 'Ben is unavailable Tue 5–9')"])
    EL -->|Yes| ASK{{"Coworker gets the request"}}
    ASK --> ACC{"Coworker accepts?"}
    ACC -->|No| DEC(["Requester notified: declined"])
    ACC -->|Yes| MODE{"Swap approval setting"}
    MODE -->|Automatic| DO
    MODE -->|Manager approval| MG{"Manager approves?"}
    MG -->|No| REJ(["Both notified: rejected"])
    MG -->|Yes| DO{{"Re-check eligibility, then swap.<br/>Update schedule + hour totals"}}
    DO --> NT{{"Notify both employees + manager"}}
    NT --> E(["Done"])
```

**Changes from the original flow:** the approval step is now a manager setting (decision 10). Eligibility is checked again at the moment of the swap, in case something changed while waiting.

---

## 6. Post and pick up an open shift

```mermaid
flowchart TD
    S(["Employee can't work a shift"]) --> PO["Post it as an open shift"]
    PO --> VIS{{"Shown in Open shifts to every<br/>eligible coworker + on manager dashboard"}}
    VIS --> PU{"Someone picks it up?"}
    PU -->|Not yet| STAY["Original employee stays assigned<br/>and responsible"]
    STAY --> PU
    PU -->|Yes| RACE{{"First valid pickup wins;<br/>others see 'already taken'"}}
    RACE --> MODE{"Swap approval setting"}
    MODE -->|Automatic| DO
    MODE -->|Manager approval| MG{"Manager approves?"}
    MG -->|No| BACK["Shift goes back to open"]
    BACK --> PU
    MG -->|Yes| DO{{"Move shift to new person.<br/>Update hour totals"}}
    DO --> NT{{"Notify original employee,<br/>new employee and manager"}}
    NT --> E(["Done"])
    PO -.->|Employee changes their mind| CAN(["Cancel post, before pickup"])
```

**Notes**
- No acceptance from the original employee is needed (decision 11).
- No time limit: an open shift can be picked up right up until it starts.

---

## 7. Availability changes after publishing

```mermaid
flowchart TD
    S(["Employee changes availability<br/>for a published week"]) --> SV{{"Change saved"}}
    SV --> CK{{"Compare with their published shifts"}}
    CK --> C{"Conflict?"}
    C -->|No| E(["Done, nothing else happens"])
    C -->|Yes| FL{{"Shift marked 'conflict' on manager<br/>dashboard + one email to manager"}}
    FL --> M{"Manager chooses"}
    M -->|Reassign| RA["Assign someone else<br/>→ publish update (Flow 1)"]
    M -->|Post as open shift| OS["Flow 6"]
    M -->|Keep it| KP["Talk to employee; dismiss the flag"]
    RA --> E2(["Done"])
    OS --> E2
    KP --> E2
```

**Rule:** the published schedule never changes by itself.

---

## 8. Start a new season

```mermaid
flowchart TD
    S(["Manager opens Employees → Season roster"]) --> NS["Create season<br/>(e.g. 'Summer 2027', start and end dates)"]
    NS --> LIST["List of everyone from past seasons"]
    LIST --> CHK["Check who is coming back"]
    CHK --> SV{{"Checked → active.<br/>Unchecked → stay inactive (history kept)"}}
    SV --> NEW{"Any new hires?"}
    NEW -->|Yes| INV["Invite them → Flow 2"]
    NEW -->|No| RM
    INV --> RM{{"Email returning staff:<br/>'Please confirm your default availability'"}}
    RM --> PAT["Set up this season's shift patterns"]
    PAT --> E(["Ready for week 1 → Flow 1"])
```

**Notes:** inactive employees can't log in to the employee area and are never scheduled. They can be reactivated in any later season.
