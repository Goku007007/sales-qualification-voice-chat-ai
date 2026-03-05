# 05 — Backend Documentation

> API routes, services, middleware, SSE streaming, provider abstractions, and reliability patterns.

---

## 5.1 API Route Overview

| Method | Route                        | Description                        | Rate Limit     |
| ------ | ---------------------------- | ---------------------------------- | -------------- |
| `POST` | `/api/sessions`              | Create a new qualification session | 10/min/IP      |
| `GET`  | `/api/sessions/[id]`         | Get session details + state        | 60/min         |
| `POST` | `/api/sessions/[id]/message` | Send a user message                | 30/min         |
| `GET`  | `/api/sessions/[id]/events`  | SSE event stream                   | 1 conn/session |
| `POST` | `/api/sessions/[id]/voice`   | Upload audio for STT               | 10/min         |
| `GET`  | `/api/analytics`             | Get aggregated analytics           | 30/min         |
| `GET`  | `/api/health`                | Health check                       | None           |

---

## 5.2 API Specifications

### 5.2.1 `POST /api/sessions` — Create Session

**Request Body:**

```typescript
const CreateSessionSchema = z.object({
  industry: z.enum(['saas', 'real_estate', 'healthcare', 'ecommerce', 'consulting']),
});
```

**Response (`201`):**

```json
{
  "id": "ses_abc123xyz",
  "industry": "saas",
  "currentState": "CONSENT",
  "createdAt": "2026-03-03T15:47:09Z",
  "initialMessage": {
    "id": "msg_001",
    "role": "agent",
    "content": "Welcome! Do you consent to proceed with this demo?",
    "timestamp": "2026-03-03T15:47:09Z"
  }
}
```

**Flow:** Validate → Generate ID → Load industry pack → Create DB record → Init orchestrator → Generate greeting → Log event → Return.

### 5.2.2 `POST /api/sessions/[id]/message` — Send Message

**Request Body:**

```typescript
const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  metadata: z
    .object({
      source: z.enum(['text', 'voice']).default('text'),
    })
    .optional(),
});
```

**Response (`200`):**

```json
{ "messageId": "msg_002", "status": "processing" }
```

> **Note:** Agent response comes via SSE, not in this HTTP response.

**Flow:** Validate → Load session → Check state accepts input → PII redaction → Save message → Log event → Trigger orchestrator (async) → Return ack.

### 5.2.3 `GET /api/sessions/[id]/events` — SSE Stream

**Event Types:**

```typescript
type SSEEvent =
  | { type: 'agent_message'; payload: AgentMessagePayload }
  | { type: 'agent_typing'; payload: { isTyping: boolean } }
  | { type: 'state_transition'; payload: StateTransitionPayload }
  | { type: 'field_extracted'; payload: FieldExtractedPayload }
  | { type: 'score_updated'; payload: ScoreUpdatedPayload }
  | { type: 'crm_updated'; payload: CRMUpdatedPayload }
  | { type: 'ticket_created'; payload: TicketCreatedPayload }
  | { type: 'followup_scheduled'; payload: FollowUpPayload }
  | { type: 'meeting_proposed'; payload: MeetingPayload }
  | { type: 'heartbeat'; payload: { timestamp: string } };
```

**Implementation:** Uses `ReadableStream` with SSE format. Heartbeat every 30s. Supports `Last-Event-ID` for reconnection replay.

### 5.2.4 `POST /api/sessions/[id]/voice` — Voice Upload

Accepts `multipart/form-data` with audio file. Returns transcript + auto-submits as text message.

### 5.2.5 `GET /api/analytics` — Analytics Data

Returns funnel counts, outcome distribution, drop-off by step, and recent sessions.

---

## 5.3 Middleware Stack

```
Request → Rate Limiter → Request Logger → Zod Validation → Error Handler → Route Handler
```

### Rate Limiting Implementation

```typescript
// src/lib/middleware/rateLimit.ts
import { NextRequest, NextResponse } from 'next/server';

const rateLimits: Record<string, { windowMs: number; max: number }> = {
  'POST:/api/sessions': { windowMs: 60_000, max: 10 },
  'POST:/api/sessions/[id]/message': { windowMs: 60_000, max: 30 },
  'GET:/api/sessions/[id]/events': { windowMs: 60_000, max: 5 },
  'POST:/api/sessions/[id]/voice': { windowMs: 60_000, max: 10 },
  'GET:/api/analytics': { windowMs: 60_000, max: 30 },
};

// In-memory store (use Redis in production)
const hitCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(req: NextRequest, routePattern: string): NextResponse | null {
  const key = `${req.method}:${routePattern}`;
  const limit = rateLimits[key];
  if (!limit) return null;

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();

  const bucket = hitCounts.get(bucketKey);
  if (!bucket || now > bucket.resetAt) {
    hitCounts.set(bucketKey, { count: 1, resetAt: now + limit.windowMs });
    return null;
  }

  bucket.count++;
  if (bucket.count > limit.max) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429 },
    );
  }
  return null;
}
```

---

## 5.3.1 Admin Routes (Demo Helpers)

| Method | Route                      | Description                               |
| ------ | -------------------------- | ----------------------------------------- |
| `POST` | `/api/admin/run-followups` | Manually trigger follow-up job processing |

> **Note:** During a live demo, GitHub Actions cron has 15+ minute delays. This route lets you trigger follow-up execution instantly to show the feature working in real-time.

---

## 5.4 Service Layer

### Session Service

```typescript
class SessionService {
  createSession(industry: IndustryType): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  updateState(id: string, state: WorkflowState): Promise<void>;
  updateLeadFields(id: string, fields: Partial<LeadFields>): Promise<void>;
  updateScore(id: string, score: number, label: string, reasons: string[]): Promise<void>;
  completeSession(id: string, outcome: SessionOutcome): Promise<void>;
}
```

### Event Service

```typescript
class EventService {
  logEvent(event: CreateEventInput): Promise<Event>;
  getSessionEvents(sessionId: string): Promise<Event[]>;
  getEventsSince(sessionId: string, afterEventId: string): Promise<Event[]>;
}
```

### Orchestration Service

```typescript
class OrchestrationService {
  processMessage(sessionId: string, message: string): Promise<void>;
  getCurrentNode(state: WorkflowState): StateNode;
  executeNode(sessionId: string, node: StateNode, input: NodeInput): Promise<NodeOutput>;
}
```

---

## 5.5 Provider Abstractions

### LLM Provider Interface

```typescript
interface LLMProvider {
  generateCompletion(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse>;

  generateStructured<T>(params: {
    systemPrompt: string;
    messages: ChatMessage[];
    schema: z.ZodSchema<T>;
  }): Promise<T>;

  healthCheck(): Promise<boolean>;
  readonly name: string;
}
```

| Provider              | Class                   | Free Tier       |
| --------------------- | ----------------------- | --------------- |
| Cloudflare Workers AI | `CloudflareLLMProvider` | 10K neurons/day |
| OpenAI                | `OpenAILLMProvider`     | BYO key         |
| Mock                  | `MockLLMProvider`       | Unlimited       |

### STT/TTS Provider Interfaces

```typescript
interface STTProvider {
  transcribe(audio: Buffer, options: { mimeType: string }): Promise<STTResult>;
}
interface TTSProvider {
  synthesize(text: string, options: { voice?: string }): Promise<Buffer>;
}
```

---

## 5.6 Adapter Pattern (Integrations)

Every adapter implements:

```typescript
interface BaseAdapter<TInput, TOutput> {
  execute(input: TInput, idempotencyKey: string): Promise<AdapterResult<TOutput>>;
  checkIdempotency(key: string): Promise<TOutput | null>;
  healthCheck(): Promise<HealthStatus>;
}
```

### CRM Adapter

- `upsertLead(payload, idempotencyKey)` → `CRMRecord`
- Implementations: `MockCRMAdapter`, `HubSpotCRMAdapter` (optional)

### Ticket Adapter

- `createTickets(tickets[], idempotencyKey)` → `Ticket[]`
- Implementation: `MockTicketAdapter`

### Calendar Adapter

- `proposeSlots(params)` → `TimeSlot[]`
- `bookSlot(slot, attendee, idempotencyKey)` → `BookingConfirmation`

### Email Adapter

- `sendRecap(params, idempotencyKey)` → `{ messageId }`

---

## 5.7 Idempotency Pattern

```typescript
// Key format: adapter_type:session_id:action:sequence
const key = `crm:ses_abc123:upsert:q3`;

async function executeWithIdempotency<T>(key, operation, store) {
  const existing = await store.get(key);
  if (existing) return existing.result;
  const lock = await store.acquireLock(key);
  try {
    const result = await operation();
    await store.set(key, { result });
    return result;
  } finally {
    await store.releaseLock(key);
  }
}
```

---

## 5.8 Error Handling

### Error Categories

| Category        | Status | Example           |
| --------------- | ------ | ----------------- |
| `VALIDATION`    | 400    | Invalid industry  |
| `NOT_FOUND`     | 404    | Session not found |
| `RATE_LIMITED`  | 429    | Too many requests |
| `ADAPTER_ERROR` | 502    | CRM API failure   |
| `INTERNAL`      | 500    | Unexpected error  |

### Retry Policy

- Max 3 attempts, exponential backoff (500ms → 1s → 2s)
- Only retry `ADAPTER_ERROR` category
- All retries use same idempotency key

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid industry selection",
    "requestId": "req_xyz789"
  }
}
```

---

## 5.9 Structured Logging

Every log entry includes: `level`, `message`, `timestamp`, `requestId`, `sessionId`, `traceId`.

| Event               | Level   |
| ------------------- | ------- |
| Session created     | `info`  |
| State transition    | `info`  |
| LLM call completed  | `info`  |
| Adapter call failed | `error` |
| PII detected        | `warn`  |
| Rate limit hit      | `warn`  |
