# 07 — Database & Schema Documentation

> Tables, relations, event sourcing, migrations, and indexing strategy.

---

## 7.1 Database Choice

**PostgreSQL 15+** via **Prisma ORM**

| Feature                      | Why It Matters                               |
| ---------------------------- | -------------------------------------------- |
| JSONB columns                | Store flexible lead fields, adapter metadata |
| Append-only pattern          | Event sourcing audit log                     |
| Indexing (B-tree, GIN)       | Fast queries on sessions, events             |
| pgvector extension           | RAG vector search (future)                   |
| Free hosting (Supabase/Neon) | Zero-cost demo                               |

> **ID Strategy:** All tables use **ULID** (Universally Unique Lexicographically Sortable Identifier) instead of CUID. ULIDs are time-ordered, so `ORDER BY id` produces the same result as `ORDER BY createdAt`. This simplifies pagination and debugging. Generated via a custom `@default()` using the `ulid` npm package.

---

## 7.2 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│    sessions      │       │    messages       │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │──┐    │ id (PK)          │
│ industry         │  │    │ session_id (FK)  │──┐
│ current_state    │  │    │ role             │  │
│ consent_given    │  ├───►│ content          │  │
│ consent_at       │  │    │ source           │  │
│ score            │  │    │ metadata (JSONB) │  │
│ score_label      │  │    │ created_at       │  │
│ score_reasons    │  │    └──────────────────┘  │
│ lead_fields (J)  │  │                          │
│ route_decision   │  │    ┌──────────────────┐  │
│ outcome          │  │    │    events         │  │
│ duration_ms      │  │    ├──────────────────┤  │
│ error_count      │  │    │ id (PK)          │  │
│ completed_at     │  ├───►│ session_id (FK)  │  │
│ created_at       │  │    │ type             │  │
│ updated_at       │  │    │ description      │  │
└──────────────────┘  │    │ metadata (JSONB) │  │
                      │    │ created_at       │  │
┌──────────────────┐  │    └──────────────────┘  │
│    tickets       │  │                          │
├──────────────────┤  │    ┌──────────────────┐  │
│ id (PK)          │  │    │ follow_up_jobs   │  │
│ session_id (FK)  │──┤    ├──────────────────┤  │
│ title            │  │    │ id (PK)          │  │
│ type             │  ├───►│ session_id (FK)  │  │
│ description      │  │    │ type             │  │
│ priority         │  │    │ day              │  │
│ status           │  │    │ description      │  │
│ assignee         │  │    │ status           │  │
│ metadata (JSONB) │  │    │ execute_at       │  │
│ created_at       │  │    │ executed_at      │  │
│ updated_at       │  │    │ payload (JSONB)  │  │
└──────────────────┘  │    │ error            │  │
                      │    │ retry_count      │  │
┌──────────────────┐  │    │ created_at       │  │
│   crm_records    │  │    └──────────────────┘  │
├──────────────────┤  │                          │
│ id (PK)          │  │    ┌──────────────────┐  │
│ session_id (FK)  │──┘    │ idempotency_keys │  │
│ external_id      │       ├──────────────────┤  │
│ provider         │       │ key (PK)         │  │
│ status           │       │ result (JSONB)   │  │
│ fields (JSONB)   │       │ created_at       │  │
│ synced_at        │       │ expires_at       │  │
│ metadata (JSONB) │       └──────────────────┘  │
│ created_at       │                              │
│ updated_at       │                              │
└──────────────────┘                              │
```

---

## 7.3 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Sessions ──────────────────────────────────────

model Session {
  id             String         @id @default(cuid())
  industry       Industry
  currentState   WorkflowState  @default(CONSENT)
  consentGiven   Boolean        @default(false)
  consentAt      DateTime?

  // Lead scoring
  score          Int?
  scoreLabel     ScoreLabel?
  scoreReasons   String[]

  // Extracted lead data (flexible JSONB)
  leadFields     Json           @default("{}")

  // Routing
  routeDecision  RouteDecision?

  // Session lifecycle
  outcome        SessionOutcome?
  durationMs     Int?
  errorCount     Int            @default(0)
  completedAt    DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // Relations
  messages       Message[]
  events         Event[]
  tickets        Ticket[]
  crmRecords     CRMRecord[]
  followUpJobs   FollowUpJob[]

  @@index([industry])
  @@index([currentState])
  @@index([createdAt])
  @@index([scoreLabel])
}

// ─── Messages ──────────────────────────────────────

model Message {
  id         String      @id @default(cuid())
  sessionId  String
  session    Session     @relation(fields: [sessionId], references: [id])
  role       MessageRole
  content    String
  source     MessageSource @default(TEXT)
  metadata   Json        @default("{}")
  createdAt  DateTime    @default(now())

  @@index([sessionId, createdAt])
}

// ─── Events (Audit Log) ───────────────────────────

model Event {
  id          String   @id @default(cuid())
  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id])
  type        String   // e.g., "session_created", "field_extracted"
  description String
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())

  // Append-only: no updatedAt, no soft-delete
  @@index([sessionId, createdAt])
  @@index([type])
}

// ─── Tickets ──────────────────────────────────────

model Ticket {
  id          String       @id @default(cuid())
  sessionId   String
  session     Session      @relation(fields: [sessionId], references: [id])
  title       String
  type        TicketType
  description String       @default("")
  priority    Priority     @default(MEDIUM)
  status      TicketStatus @default(CREATED)
  assignee    String?
  metadata    Json         @default("{}")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([sessionId])
  @@index([status])
}

// ─── CRM Records ─────────────────────────────────

model CRMRecord {
  id          String    @id @default(cuid())
  sessionId   String
  session     Session   @relation(fields: [sessionId], references: [id])
  externalId  String?   // HubSpot/Salesforce record ID
  provider    String    @default("mock")
  status      String    @default("created")
  fields      Json      @default("{}")
  syncedAt    DateTime?
  metadata    Json      @default("{}")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([sessionId])
  @@index([externalId])
}

// ─── Follow-Up Jobs ──────────────────────────────

model FollowUpJob {
  id          String        @id @default(cuid())
  sessionId   String
  session     Session       @relation(fields: [sessionId], references: [id])
  type        String        // "friendly_ping", "value_add", "close_loop"
  day         Int           // Day 1, 3, 7
  description String
  status      JobStatus     @default(SCHEDULED)
  executeAt   DateTime
  executedAt  DateTime?
  payload     Json          @default("{}")
  error       String?
  retryCount  Int           @default(0)
  createdAt   DateTime      @default(now())

  @@index([status, executeAt])
  @@index([sessionId])
}

// ─── Idempotency Keys ────────────────────────────

model IdempotencyKey {
  key        String   @id
  result     Json
  createdAt  DateTime @default(now())
  expiresAt  DateTime

  @@index([expiresAt])
}

// ─── Enums ───────────────────────────────────────

enum Industry {
  SAAS
  REAL_ESTATE
  HEALTHCARE
  ECOMMERCE
  CONSULTING
}

enum WorkflowState {
  CONSENT
  OPENING
  QUALIFY_LOOP
  SCORE
  ROUTE
  ACTIONS
  FOLLOWUP_SCHEDULED
  COMPLETED
  ERROR
}

enum ScoreLabel {
  COLD
  WARM
  HOT
}

enum RouteDecision {
  HOT
  WARM
  COLD
  RISK
}

enum SessionOutcome {
  MEETING_BOOKED
  NURTURE
  HANDOFF
  DECLINED
  ABANDONED
  ERROR
}

enum MessageRole {
  USER
  AGENT
  SYSTEM
}

enum MessageSource {
  TEXT
  VOICE
}

enum TicketType {
  STAKEHOLDER_INVITE
  RISK_REVIEW
  HANDOFF
  FOLLOWUP
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketStatus {
  CREATED
  PENDING
  IN_PROGRESS
  RESOLVED
  CANCELLED
}

enum JobStatus {
  SCHEDULED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

## 7.4 Event Sourcing Design

### Principles

1. **Append-only:** Events are never updated or deleted
2. **Immutable:** No `updatedAt` column on events
3. **Self-describing:** Each event has `type` + `description` + `metadata`
4. **Ordered:** Events ordered by `createdAt` within a session
5. **Replayable:** Session state can be reconstructed from events

### Event Types

| Event Type            | Description                  | Metadata                    |
| --------------------- | ---------------------------- | --------------------------- |
| `session_created`     | New session started          | industry                    |
| `consent_given`       | User consented               | timestamp                   |
| `consent_declined`    | User declined                | timestamp                   |
| `opening_delivered`   | Opening message sent         | —                           |
| `question_asked`      | Qualification question asked | questionIndex, question     |
| `answer_received`     | User answer received         | source (text/voice)         |
| `field_extracted`     | Structured field extracted   | field, value, confidence    |
| `follow_up_triggered` | Follow-up question asked     | missingFields               |
| `score_computed`      | Lead score calculated        | score, label, reasons       |
| `route_decided`       | Routing decision made        | decision, reason            |
| `crm_upserted`        | CRM record created/updated   | recordId, fieldsChanged     |
| `ticket_created`      | Ticket created               | ticketId, type              |
| `meeting_proposed`    | Meeting slots proposed       | slotCount                   |
| `meeting_booked`      | Meeting confirmed            | confirmedTime               |
| `followup_scheduled`  | Follow-up job created        | day, type                   |
| `followup_executed`   | Follow-up job ran            | day, type, success          |
| `session_completed`   | Session ended normally       | outcome, durationMs         |
| `session_error`       | Error occurred               | errorType, errorMessage     |
| `pii_detected`        | PII was found and redacted   | piiType (no raw value)      |
| `adapter_called`      | External adapter invoked     | adapter, action, durationMs |
| `adapter_failed`      | External adapter failed      | adapter, action, error      |

---

## 7.5 Indexing Strategy

| Table              | Index                      | Purpose                          |
| ------------------ | -------------------------- | -------------------------------- |
| `sessions`         | `(industry)`               | Filter by industry for analytics |
| `sessions`         | `(current_state)`          | Find active sessions             |
| `sessions`         | `(created_at)`             | Time-range analytics queries     |
| `sessions`         | `(score_label)`            | Outcome distribution queries     |
| `messages`         | `(session_id, created_at)` | Ordered message retrieval        |
| `events`           | `(session_id, created_at)` | Ordered event timeline           |
| `events`           | `(type)`                   | Aggregate by event type          |
| `tickets`          | `(session_id)`             | Session tickets lookup           |
| `tickets`          | `(status)`                 | Active tickets query             |
| `follow_up_jobs`   | `(status, execute_at)`     | Job runner: find due jobs        |
| `follow_up_jobs`   | `(session_id)`             | Session follow-ups lookup        |
| `idempotency_keys` | `(expires_at)`             | Cleanup expired keys             |
| `crm_records`      | `(session_id)`             | Session CRM lookup               |
| `crm_records`      | `(external_id)`            | External ID lookup               |

---

## 7.6 Migration Strategy

### Using Prisma Migrate

```bash
# Create initial migration
npx prisma migrate dev --name init

# After schema changes
npx prisma migrate dev --name add_field_name

# Production deployment
npx prisma migrate deploy

# Reset (development only)
npx prisma migrate reset
```

### Migration Naming Convention

```
YYYYMMDD_NNN_description
e.g., 20260303_001_init
      20260310_002_add_score_reasons
      20260315_003_add_follow_up_jobs
```

---

## 7.7 Seed Data

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

// Realistic distribution: 25% hot, 40% warm, 35% cold
const SCORE_DISTRIBUTION = [
  // HOT leads (25%)
  {
    score: 85,
    label: 'HOT',
    outcome: 'MEETING_BOOKED',
    fields: {
      budget_range: '$50k+',
      timeline: 'This quarter',
      use_case: 'CRM replacement',
      decision_maker: 'yes',
    },
  },
  {
    score: 92,
    label: 'HOT',
    outcome: 'MEETING_BOOKED',
    fields: {
      budget_range: '$100k+',
      timeline: 'Immediate',
      use_case: 'Pipeline automation',
      decision_maker: 'yes',
    },
  },
  {
    score: 74,
    label: 'HOT',
    outcome: 'MEETING_BOOKED',
    fields: {
      budget_range: '$30k-$50k',
      timeline: 'Next month',
      use_case: 'Sales analytics',
      decision_maker: 'yes',
    },
  },
  // WARM leads (40%)
  {
    score: 58,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$10k-$30k',
      timeline: 'Next quarter',
      use_case: 'Reporting',
      decision_maker: 'partial',
    },
  },
  {
    score: 45,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$15k-$25k',
      timeline: '3-6 months',
      use_case: 'Lead tracking',
      decision_maker: 'unknown',
    },
  },
  {
    score: 62,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$20k-$40k',
      timeline: 'Q3 2026',
      use_case: 'Customer onboarding',
      decision_maker: 'partial',
    },
  },
  {
    score: 51,
    label: 'WARM',
    outcome: 'NURTURE',
    fields: {
      budget_range: '$10k-$20k',
      timeline: 'Evaluating',
      use_case: 'Data integration',
      decision_maker: 'no',
    },
  },
  // COLD leads (35%)
  {
    score: 22,
    label: 'COLD',
    outcome: 'NURTURE',
    fields: {
      budget_range: null,
      timeline: 'Next year',
      use_case: 'Just browsing',
      decision_maker: 'unknown',
    },
  },
  {
    score: 15,
    label: 'COLD',
    outcome: 'NURTURE',
    fields: {
      budget_range: '<$5k',
      timeline: 'No timeline',
      use_case: 'Research',
      decision_maker: 'no',
    },
  },
  {
    score: 28,
    label: 'COLD',
    outcome: 'NURTURE',
    fields: {
      budget_range: null,
      timeline: '6+ months',
      use_case: 'Exploring options',
      decision_maker: 'unknown',
    },
  },
];

async function seed() {
  const industries = ['SAAS', 'REAL_ESTATE', 'HEALTHCARE', 'ECOMMERCE', 'CONSULTING'] as const;

  for (const industry of industries) {
    for (const profile of SCORE_DISTRIBUTION) {
      const sessionId = ulid();
      const duration = 120_000 + Math.floor(Math.random() * 480_000); // 2-10 min

      await prisma.session.create({
        data: {
          id: sessionId,
          industry: industry as any,
          currentState: 'COMPLETED',
          consentGiven: true,
          consentAt: new Date(Date.now() - Math.random() * 7 * 86_400_000), // Past week
          score: profile.score,
          scoreLabel: profile.label as any,
          scoreReasons: [`Score ${profile.score}: ${profile.fields.use_case || 'N/A'}`],
          leadFields: profile.fields,
          routeDecision: profile.label as any,
          outcome: profile.outcome as any,
          durationMs: duration,
          completedAt: new Date(),
        },
      });
    }
  }

  console.log(`Seeded ${industries.length * SCORE_DISTRIBUTION.length} sessions`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 7.8 Data Retention & Cleanup

| Data                       | Retention  | Cleanup Method             |
| -------------------------- | ---------- | -------------------------- |
| Active sessions            | Indefinite | —                          |
| Completed sessions         | 90 days    | Cron job                   |
| Events (audit log)         | 1 year     | Cron job (archive first)   |
| Messages                   | 90 days    | Cascade with session       |
| Idempotency keys           | 24 hours   | `WHERE expires_at < NOW()` |
| Follow-up jobs (completed) | 30 days    | Cron job                   |
