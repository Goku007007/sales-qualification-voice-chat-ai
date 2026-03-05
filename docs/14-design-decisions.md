# Design Decisions

> Why we built things the way we did. Each decision explains the problem, alternatives considered, and the reasoning behind the final choice.

---

## D007 — Custom State Machine Orchestrator (Not LangGraph)

### Problem

We need a directed graph engine that executes workflow nodes in sequence, supports conditional branching, and manages session state through a qualification flow with 7 distinct steps.

### Alternatives Considered

| Option                 | Pros                                                    | Cons                                                                                       |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **LangGraph.js**       | Battle-tested concepts, community support               | Pre-1.0 API (breaking changes), heavy dependency tree (~15 packages), overkill for 7 nodes |
| **Raw if/else chains** | No dependencies                                         | Unmaintainable, no separation of concerns, hard to test individual nodes                   |
| **Custom StateGraph**  | ~200 LOC, zero dependencies, testable, same API surface | We maintain it ourselves                                                                   |

### Decision

Build a custom `StateGraph<S>` class (~200 lines) that provides:

- `addNode(name, fn)` — register a node function
- `addEdge(from, to)` — unconditional transition
- `addConditionalEdges(from, router, routes)` — branching based on state
- `compile()` → `{ run(state) }` — returns an executable runner

### Why This Wins

1. **Portfolio signal:** "I built the state machine" is stronger than "I installed LangGraph"
2. **Dependency risk:** LangGraph.js is at `0.2.x` — the API surface changes between minor versions
3. **Simplicity:** Our graph has 7 nodes and 6 edges. LangGraph's checkpointing, streaming, and multi-agent features are unused overhead
4. **Testability:** Each node is a pure `(state) => Partial<state>` function, easily unit-tested in isolation
5. **Understanding:** When asked "how does the orchestrator work?" in an interview, we can walk through every line

### Trade-off Accepted

We lose LangGraph's built-in checkpointing and human-in-the-loop features. For this demo, these aren't needed. If they were, we'd add checkpointing as a ~50-line middleware wrapper around the runner.

---

## D011 — ULID for IDs (Not CUID)

### Problem

Every table needs unique identifiers. The choice of ID format affects pagination, debugging, and query performance.

### Alternatives Considered

| Option         | Sortable           | Size      | Human-readable |
| -------------- | ------------------ | --------- | -------------- |
| UUIDv4         | No                 | 36 chars  | No             |
| CUID           | No                 | 25 chars  | Somewhat       |
| **ULID**       | Yes (time-ordered) | 26 chars  | Somewhat       |
| Auto-increment | Yes                | 4-8 bytes | Yes            |

### Decision

Use ULID (Universally Unique Lexicographically Sortable Identifier).

### Why This Wins

1. `ORDER BY id` produces the same result as `ORDER BY createdAt` — simplifies pagination queries
2. Time-encoded — you can extract the creation timestamp from the ID itself
3. No coordination needed (unlike auto-increment) — works in distributed systems
4. B-tree index friendly — sequential nature means fewer page splits

### Implementation

```typescript
import { ulid } from 'ulid';
const id = ulid(); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

---

## D012 — Vercel AI SDK (Not LangChain.js)

### Problem

We need LLM provider abstraction with support for structured output and multiple providers (Cloudflare, OpenAI, Mock).

### Alternatives Considered

| Option            | Bundle Size | Streaming | Structured Output | Next.js Integration |
| ----------------- | ----------- | --------- | ----------------- | ------------------- |
| Raw `fetch`       | 0KB         | Manual    | Manual            | Manual              |
| **LangChain.js**  | ~500KB      | Yes       | Yes               | Adapter needed      |
| **Vercel AI SDK** | ~50KB       | Native    | Native (Zod)      | First-class         |

### Decision

Use Vercel AI SDK (`ai` package) with provider-specific adapters.

### Why This Wins

1. **10x lighter** than LangChain.js — matters for serverless cold starts on Vercel
2. **First-class Next.js support** — `StreamingTextResponse`, React Server Components integration
3. **Native Zod schemas** for structured output — matches our validation layer
4. **Provider adapter pattern** — `@ai-sdk/openai` and Cloudflare/Mock adapters swap behind one factory

### Trade-off Accepted

We lose LangChain's retrieval chains and document loaders. Our RAG implementation uses simple JSON knowledge bases with text similarity, which doesn't need LangChain's abstractions.

---

## D002 — SSE Over WebSockets

### Problem

The dashboard needs real-time updates as the AI agent processes messages, extracts fields, and calls tools. The client needs to receive events without polling.

### Why SSE (Not WebSockets)

1. **One-way is enough** — server pushes events to client. Client sends messages via regular POST requests
2. **Auto-reconnect** — `EventSource` API handles reconnection automatically with `Last-Event-ID`
3. **CDN-friendly** — works through Vercel Edge, Cloudflare, and every CDN. WebSockets require special proxying
4. **Simpler server-side** — write to a `ReadableStream`, no connection lifecycle management
5. **Browser native** — no library needed, unlike Socket.io (~50KB)

### When We'd Switch to WebSockets

If we needed bi-directional streaming (e.g., real-time audio streaming for voice), we'd add a WebSocket endpoint alongside SSE. The two can coexist.

---

## D006 — Event Sourcing for Audit Log

### Problem

We need to know what happened during every session: what fields were extracted, what tools were called, what errors occurred, and in what order.

### Why Event Sourcing (Not Mutable State)

Traditional approach:

```
session.score = 85;  // Previous value is lost forever
```

Event sourcing approach:

```
Event: { type: 'score_computed', payload: { score: 85, reasons: [...] }, timestamp: ... }
// Previous events preserved, full history available
```

### Benefits Realized

1. **Audit trail** — every action is traceable with timestamps
2. **Dashboard** — the UI is just a live projection of events
3. **Analytics** — conversion funnel and drop-off analysis computed from events
4. **Debugging** — replay a session's events to understand what happened
5. **Compliance** — immutable log satisfies most audit requirements

---

## D008 — Mock Adapters as First-Class

### Problem

The demo needs to show CRM integration, calendar booking, ticket creation, and email sending — but we don't want to require real HubSpot, Google Calendar, or SendGrid accounts.

### Why Mocks Are First-Class (Not Afterthoughts)

```typescript
// The interface IS the skill demonstration
interface CRMAdapter {
  createContact(fields: ContactFields): Promise<AdapterResult<Contact>>;
  updateDeal(dealId: string, updates: DealUpdates): Promise<AdapterResult<Deal>>;
}

// Mock implementation (demo)
class MockCRMAdapter implements CRMAdapter { ... }

// Real implementation (production)
class HubSpotCRMAdapter implements CRMAdapter { ... }
```

### Why This Matters for Portfolio

1. **Interface design** is a harder skill than API integration — designing the right abstraction boundary is the valuable part
2. **Testability** — all tests use mocks, no external services needed in CI
3. **Swappability** — implementing the real adapter is a mechanical exercise once the interface is designed
4. **Idempotency** — mock adapters simulate idempotency key behavior, proving the pattern works before connecting to real services

---

## D007b — Weighted Scoring Over Binary Classification

### Problem

After qualification, we need to classify leads. A binary "qualified/not qualified" loses nuance.

### Why Weighted Scoring

```
Score = (Budget × 0.35) + (Authority × 0.25) + (Need × 0.25) + (Timeline × 0.15)
```

Each factor maps to a tier (1-5), producing a 0-100 score with a label:

- **Hot** (67-100): High intent, decision-maker, real budget → book meeting
- **Warm** (34-66): Some interest, missing factors → nurture sequence
- **Cold** (0-33): Low intent or missing data → education track

### Why These Weights

Budget gets the highest weight (0.35) because in B2B SaaS, budget availability is the strongest predictor of deal close. Authority (0.25) is next because even with budget, a non-decision-maker can't sign. Need and timeline are important but can change more easily.

Each industry pack can override these weights — real estate weights timeline higher (move-in date is critical), healthcare weights need higher (patient volume is the driver).
