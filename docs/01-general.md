# 01 — General Documentation

> Project overview, glossary, conventions, and contributing guide.

---

## 1.1 Project Overview

### What We're Building

A **Sales Qualification Voice/Chat AI Agent** — a production-style demo application that simulates a real enterprise sales qualification pipeline:

1. **Inbound conversation** — A prospect (demo user) interacts with an AI agent via voice or text.
2. **Structured qualification** — The agent follows a controlled 5-question flow, extracting structured data at each step.
3. **Live dashboard** — A real-time dashboard shows lead scoring, CRM field population, ticket creation, event logs, and follow-up scheduling as the conversation progresses.

### Why This Exists

This project serves as a **portfolio piece** that demonstrates production-grade AI engineering, not just "I can call an API." It proves competence in:

- Agent orchestration (stateful, graph-based flows)
- Structured data extraction with validation
- Integration adapter patterns with reliability (idempotency, retries)
- Event-sourced audit logging
- Safety controls (consent, PII redaction)
- Observability (OpenTelemetry tracing)
- Analytics (conversion funnels, drop-off tracking)

### Who Is the Target Audience?

| Audience                         | What They Care About                                 |
| -------------------------------- | ---------------------------------------------------- |
| **Recruiters / Hiring Managers** | "Can this person build production systems?"          |
| **Technical Reviewers**          | Architecture decisions, code quality, patterns used  |
| **Fellow Engineers**             | Reusable patterns, clean abstractions, testability   |
| **The Developer (You)**          | Learning production AI engineering patterns hands-on |

---

## 1.2 Glossary

| Term                      | Definition                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| **Lead**                  | A potential customer/prospect being qualified by the AI agent                                     |
| **Qualification**         | The process of determining if a lead is a good fit (budget, timeline, authority, need)            |
| **Industry Pack**         | A configuration bundle (questions, rubric, templates, FAQ) for a specific industry vertical       |
| **Orchestrator**          | The custom StateGraph engine that controls conversation flow                                      |
| **State Node**            | A single step in the orchestration graph (e.g., CONSENT, QUALIFY_LOOP, SCORE)                     |
| **Structured Extraction** | Using LLM + Zod schemas to extract typed fields from free-text responses                          |
| **Adapter**               | An abstraction layer for external integrations (CRM, Calendar, Email, Ticket)                     |
| **Idempotency Key**       | A unique identifier ensuring a tool call is executed at most once, even if retried                |
| **Event Log**             | An append-only audit trail recording every system action and state transition                     |
| **Lead Score**            | A 0–100 numeric score indicating lead quality (Cold: 0–33, Warm: 34–66, Hot: 67–100)              |
| **Follow-Up**             | Scheduled outreach actions (Day 1, Day 3, Day 7) for leads that don't book meetings               |
| **PII**                   | Personally Identifiable Information (emails, phones, addresses) — must be redacted before storage |
| **SSE**                   | Server-Sent Events — the mechanism for real-time dashboard updates                                |
| **Provider**              | An abstraction for swappable service implementations (LLM, STT, TTS)                              |
| **Guardrails**            | Safety controls: consent verification, content filtering, PII redaction, policy enforcement       |
| **BANT**                  | Budget, Authority, Need, Timeline — classic sales qualification framework                         |
| **Nurture Path**          | The flow for cold leads: scheduled follow-ups instead of immediate meeting booking                |
| **Handoff**               | Routing a conversation to a human agent (mocked in demo)                                          |
| **RAG**                   | Retrieval-Augmented Generation — using vector search to add context to LLM prompts                |

---

## 1.3 Coding Conventions

### Language & Style

- **Language:** TypeScript (strict mode) throughout
- **Runtime:** Node.js 20 LTS
- **Framework:** Next.js 14 (App Router)
- **Style:** ESLint (eslint-config-next) + Prettier
- **Imports:** Use `@/` path alias for `src/` directory

### Naming Conventions

| Element               | Convention                          | Example                               |
| --------------------- | ----------------------------------- | ------------------------------------- |
| Files (components)    | PascalCase                          | `LeadScoreGauge.tsx`                  |
| Files (utilities)     | camelCase                           | `extractLeadFields.ts`                |
| Files (types)         | camelCase                           | `leadTypes.ts`                        |
| Files (constants)     | camelCase                           | `industryPacks.ts`                    |
| React components      | PascalCase                          | `export function LeadScoreGauge()`    |
| Functions             | camelCase                           | `function calculateScore()`           |
| Constants             | UPPER_SNAKE_CASE                    | `const MAX_QUESTIONS = 5`             |
| Types/Interfaces      | PascalCase                          | `interface LeadPayload {}`            |
| Enums                 | PascalCase (members UPPER_SNAKE)    | `enum LeadStatus { HOT, WARM, COLD }` |
| Database tables       | snake_case                          | `lead_sessions`                       |
| API routes            | kebab-case                          | `/api/sessions/[id]/events`           |
| Environment variables | UPPER_SNAKE_CASE                    | `DATABASE_URL`                        |
| CSS classes           | kebab-case (Tailwind utility-first) | `bg-slate-900 text-white`             |

### File Organization Rules

1. **One component per file** — no barrel exports unless explicitly needed
2. **Co-locate tests** — test files go in `tests/` mirroring `src/` structure
3. **Types near usage** — shared types in `src/types/`, component-local types in the component file
4. **Constants near usage** — global constants in `src/lib/constants.ts`, domain constants in their module

### Code Quality Rules

1. **No `any` types** — use `unknown` + type guards if type is truly unknown
2. **Explicit return types** on exported functions
3. **Error boundaries** on all page-level components
4. **Zod validation** on all API inputs and LLM outputs
5. **Idempotency keys** on all adapter/tool calls
6. **Event logging** for all state transitions and tool calls

---

## 1.4 Environment Variables

```env
# ─── Database ───────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@host:5432/sales_qual_db"

# ─── AI Providers ──────────────────────────────────────
# Cloudflare Workers AI (default free provider)
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_MODEL="@cf/meta/llama-3.1-8b-instruct"

# Optional: OpenAI (BYO key)
OPENAI_API_KEY=""

# ─── Active Provider Selection ─────────────────────────
LLM_PROVIDER="cloudflare"          # cloudflare | openai | mock
STT_PROVIDER="browser"             # browser | whisper | deepgram
TTS_PROVIDER="browser"             # browser | elevenlabs

# ─── CRM Integration (optional) ───────────────────────
CRM_PROVIDER="mock"                # mock | hubspot | salesforce
HUBSPOT_API_KEY=""
SALESFORCE_CLIENT_ID=""
SALESFORCE_CLIENT_SECRET=""

# ─── Calendar Integration (optional) ──────────────────
CALENDAR_PROVIDER="mock"           # mock | google | microsoft
GOOGLE_CALENDAR_CREDENTIALS=""
MICROSOFT_GRAPH_CLIENT_ID=""

# ─── Observability ─────────────────────────────────────
OTEL_EXPORTER_OTLP_ENDPOINT=""
OTEL_SERVICE_NAME="sales-qual-agent"

# ─── App Config ────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# ─── Admin ─────────────────────────────────────────────
ADMIN_API_TOKEN="replace-with-strong-secret"
```

---

## 1.5 Git Workflow

### Branch Strategy

```
main              ← production-ready (auto-deploys to Vercel)
├── develop       ← integration branch
│   ├── feat/*    ← feature branches
│   ├── fix/*     ← bug fixes
│   └── docs/*    ← documentation updates
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(orchestrator): add CONSENT state node with timeout handling
fix(extraction): handle missing budget field gracefully
docs(architecture): add data flow diagram
test(scoring): add unit tests for lead scoring engine
chore(deps): bump next to 14.2.x
refactor(adapters): extract base adapter interface
```

### PR Checklist

- [ ] Code compiles with no TypeScript errors
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] No `console.log` statements (use structured logger)
- [ ] API inputs validated with Zod
- [ ] Event logging added for new state transitions
- [ ] Documentation updated if API or schema changed

---

## 1.6 Decision Log

> Track key architectural decisions and their rationale.

| #    | Decision                                          | Rationale                                                                                                    | Date       |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| D001 | Use Next.js App Router (not Pages Router)         | Server Components, streaming, built-in API routes, industry standard                                         | 2026-03-03 |
| D002 | SSE over WebSockets for real-time updates         | Simpler, works through proxies/CDNs, sufficient for one-way updates                                          | 2026-03-03 |
| D003 | DB-backed job queue over Redis/SQS                | Free tier friendly, simpler ops, sufficient for demo scale                                                   | 2026-03-03 |
| D004 | Provider abstraction for LLM/STT/TTS              | Enables free-tier demo with production-ready swap capability                                                 | 2026-03-03 |
| D005 | Zod for schema validation (not JSON Schema)       | TypeScript-native, composable, excellent DX, works at API + extraction layers                                | 2026-03-03 |
| D006 | Event sourcing for audit log                      | Immutable history, replay capability, compliance-ready                                                       | 2026-03-03 |
| D007 | Custom state-machine orchestrator (not LangGraph) | ~200 LOC, no pre-1.0 dependency risk, stronger portfolio signal, same concepts (addNode/addEdge/compile)     | 2026-03-03 |
| D008 | Mock adapters as first-class (not afterthought)   | Demo must work without external accounts; adapter interface is the skill to show                             | 2026-03-03 |
| D009 | Prisma ORM for database access                    | Type-safe queries, auto-generated client, migration management, wide adoption                                | 2026-03-03 |
| D010 | Zustand for client state (not Redux)              | Minimal boilerplate, excellent TypeScript support, simple enough for this scope                              | 2026-03-03 |
| D011 | ULID for IDs (not CUID)                           | Lexicographically sortable (time-ordered), `ORDER BY id` equals `ORDER BY created_at`, better for pagination | 2026-03-03 |
| D012 | Vercel AI SDK (not LangChain.js)                  | Lighter, first-class Next.js streaming support, structured output, simpler API surface                       | 2026-03-03 |

---

## 1.7 Project Milestones

| Phase | Milestone                                     | Target |
| ----- | --------------------------------------------- | ------ |
| 0     | Documentation complete, project scaffolded    | Week 1 |
| 1     | Core orchestrator + chat UI (text only)       | Week 2 |
| 2     | Structured extraction + live dashboard panels | Week 3 |
| 3     | Scoring, routing, adapters, event timeline    | Week 4 |
| 4     | Voice UI + follow-up scheduler                | Week 5 |
| 5     | Analytics page + observability                | Week 6 |
| 6     | Polish, testing, deployment                   | Week 7 |

---

## 1.8 Related Resources

- [LangGraph Documentation](https://github.com/langchain-ai/langgraph)
- [XState Documentation](https://xstate.js.org/)
- [OpenTelemetry JS SDK](https://opentelemetry.io/docs/languages/js/)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Zod Documentation](https://zod.dev/)
