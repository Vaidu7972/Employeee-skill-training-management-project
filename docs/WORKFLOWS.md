# Workflow Lifecycles – SkillSphere

Detailed processes for operations, assessments, and ticketing workflows.

---

## 1. Skill Assessment & Approval Workflow

```mermaid
sequenceDiagram
    actor Employee
    actor Manager
    participant DB as PostgreSQL
    
    Note over Employee: Skill assigned by Manager/Admin
    Employee->>DB: Fetch Assigned Skill (Status: ASSIGNED)
    Employee->>Employee: Complete Rating (1-5), comments, experience
    Employee->>DB: Submit Assessment (Status: SUBMITTED)
    DB-->>Manager: Trigger Alert Notification
    Manager->>Manager: Review rating & optional changes
    alt Approve Assessment
        Manager->>DB: Approve Assessment (Status: APPROVED, finalRating set)
        Note over DB: Recalculate Gaps & SLA Priority
    else Reject Assessment
        Manager->>DB: Reject Assessment (Status: REJECTED, comments required)
    end
    DB-->>Employee: Notify assessment decision
```

- **Skill Gap Formula**: `Required Rating - Final Rating = Gap`
- **Gap Priorities**:
  - `Gap <= 0` -> No Gap
  - `Gap = 1` -> Low priority
  - `Gap = 2` -> Medium priority
  - `Gap >= 3` -> High priority (recommends training automatically)

---

## 2. Training Plan & Certificate Verification

1. **Assignment**: Admin or Manager assigns a training plan.
2. **Updates**: Employee initiates progress (Not Started to In Progress). Progress percentage updates (1% - 99%).
3. **Completion Request**: Employee slides progress to 100%, status becomes `SUBMITTED_FOR_REVIEW`. Employee uploads a certificate attachment.
4. **Verification**: Manager reviews the uploaded certificate. If details align, sets status to `VERIFIED`.

---

## 3. Helpdesk Support Tickets & SLA Workflow

```mermaid
stateDiagram-v2
    [*] --> OPEN: Employee raises ticket
    OPEN --> ASSIGNED: Support Admin allocates agent
    ASSIGNED --> IN_PROGRESS: Agent posts public reply
    IN_PROGRESS --> WAITING_FOR_EMPLOYEE: Agent requests details
    WAITING_FOR_EMPLOYEE --> IN_PROGRESS: Employee posts details
    IN_PROGRESS --> RESOLVED: Agent fixes bug & fills details
    RESOLVED --> CLOSED: Employee confirms resolution
    RESOLVED --> REOPENED: Employee reopens within 3 days
    REOPENED --> IN_PROGRESS: Agent reviews details
    CLOSED --> [*]
```

- **SLA Timing Targets**:
  - `CRITICAL` -> 1 hour
  - `HIGH` -> 4 hours
  - `MEDIUM` -> 8 hours
  - `LOW` -> 24 hours
- If the ticket first response time exceeds these parameters, the cron job flags the SLA as `BREACHED` and triggers alerts.
