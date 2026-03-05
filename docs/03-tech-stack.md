# 03 — Tech Stack & Versions

> Every technology, library, and tool used in the project with pinned versions and rationale.

---

## 3.1 Core Stack Summary

| Layer                | Technology        | Version  | Purpose                                     |
| -------------------- | ----------------- | -------- | ------------------------------------------- |
| **Runtime**          | Node.js           | 20.x LTS | JavaScript runtime                          |
| **Language**         | TypeScript        | 5.4.x    | Type safety                                 |
| **Framework**        | Next.js           | 14.2.x   | Full-stack React framework (App Router)     |
| **Styling**          | TailwindCSS       | 3.4.x    | Utility-first CSS                           |
| **UI Components**    | shadcn/ui         | latest   | Radix-based component library               |
| **State Management** | Zustand           | 4.5.x    | Client-side state                           |
| **Database ORM**     | Prisma            | 5.x      | Type-safe database access                   |
| **Database**         | PostgreSQL        | 15+      | Relational data store                       |
| **Validation**       | Zod               | 3.23.x   | Schema validation                           |
| **AI Orchestration** | Custom StateGraph | —        | Hand-built directed graph engine (~200 LOC) |
| **LLM SDK**          | Vercel AI SDK     | 3.x      | Provider-agnostic LLM interface             |
| **Tracing**          | OpenTelemetry     | 1.x      | Observability                               |
| **Package Manager**  | npm               | 10.x     | Dependency management                       |

---

## 3.2 Frontend Dependencies

### Core

| Package      | Version  | Purpose            | Why This                                       |
| ------------ | -------- | ------------------ | ---------------------------------------------- |
| `next`       | `14.2.x` | Framework          | App Router, Server Components, API routes, SSR |
| `react`      | `18.3.x` | UI library         | Industry standard, concurrent features         |
| `react-dom`  | `18.3.x` | React DOM renderer | Required by React                              |
| `typescript` | `5.4.x`  | Type system        | Strict mode for safety                         |

### Styling & UI

| Package                    | Version   | Purpose               | Why This                            |
| -------------------------- | --------- | --------------------- | ----------------------------------- |
| `tailwindcss`              | `3.4.x`   | Utility CSS           | Rapid styling, design system tokens |
| `postcss`                  | `8.4.x`   | CSS processing        | Required by Tailwind                |
| `autoprefixer`             | `10.4.x`  | CSS vendor prefixes   | Browser compatibility               |
| `class-variance-authority` | `0.7.x`   | Component variants    | Type-safe className composition     |
| `clsx`                     | `2.1.x`   | Class merging         | Conditional class names             |
| `tailwind-merge`           | `2.3.x`   | Tailwind class dedup  | Prevents conflicting utilities      |
| `lucide-react`             | `0.378.x` | Icons                 | Consistent, tree-shakeable icon set |
| `@radix-ui/react-*`        | `1.x`     | Accessible primitives | Used by shadcn/ui                   |

### State Management

| Package   | Version  | Purpose           | Why This                              |
| --------- | -------- | ----------------- | ------------------------------------- |
| `zustand` | `4.5.x`  | Client state      | Minimal boilerplate, great TS support |
| `immer`   | `10.1.x` | Immutable updates | Safe state mutations in Zustand       |

### Animation

| Package         | Version | Purpose    | Why This                                 |
| --------------- | ------- | ---------- | ---------------------------------------- |
| `framer-motion` | `11.x`  | Animations | Declarative, layout animations, gestures |

### Data Visualization

| Package    | Version  | Purpose | Why This                          |
| ---------- | -------- | ------- | --------------------------------- |
| `recharts` | `2.12.x` | Charts  | React-native charts for analytics |

### Real-Time

| Package              | Version | Purpose    | Why This                                |
| -------------------- | ------- | ---------- | --------------------------------------- |
| Native `EventSource` | —       | SSE client | Built-in browser API, no library needed |

---

## 3.3 Backend Dependencies

### API & Middleware

| Package             | Version  | Purpose             | Why This                                                                   |
| ------------------- | -------- | ------------------- | -------------------------------------------------------------------------- |
| `next` (API routes) | `14.2.x` | HTTP handlers       | Built-in, no separate server needed                                        |
| `zod`               | `3.23.x` | Input validation    | TypeScript-native, composable schemas                                      |
| `ulid`              | `2.3.x`  | Sortable unique IDs | Time-ordered, lexicographically sortable (better than CUID for pagination) |
| `nanoid`            | `5.x`    | Short unique IDs    | Human-readable identifiers                                                 |
| `next-rate-limit`   | `3.x`    | Rate limiting       | Per-route request throttling                                               |

### Database

| Package          | Version | Purpose          | Why This                                 |
| ---------------- | ------- | ---------------- | ---------------------------------------- |
| `prisma`         | `5.x`   | ORM + migrations | Type-safe queries, auto-generated client |
| `@prisma/client` | `5.x`   | Database client  | Generated from schema                    |

### AI / LLM

| Package            | Version | Purpose                      | Why This                                        |
| ------------------ | ------- | ---------------------------- | ----------------------------------------------- |
| `ai`               | `3.x`   | Vercel AI SDK                | Streaming, structured output, provider adapters |
| `@ai-sdk/openai`   | `0.x`   | OpenAI adapter               | Optional BYO-key provider                       |
| `fetch` (built-in) | Node 20 | Cloudflare adapter transport | No extra package needed for Workers AI          |

> **Note:** No LangGraph dependency. The orchestrator is a custom ~200-line `StateGraph` class that provides `addNode()`, `addEdge()`, `addConditionalEdges()`, and `compile()`. Building it from scratch is a stronger portfolio demonstration than installing a library.

### Observability

| Package                                   | Version  | Purpose       | Why This                    |
| ----------------------------------------- | -------- | ------------- | --------------------------- |
| `@opentelemetry/api`                      | `1.8.x`  | OTel API      | Standard tracing interface  |
| `@opentelemetry/sdk-node`                 | `0.50.x` | OTel Node SDK | Auto-instrumentation setup  |
| `@opentelemetry/sdk-trace-node`           | `1.23.x` | Trace SDK     | Span creation and export    |
| `@opentelemetry/exporter-trace-otlp-http` | `0.50.x` | OTLP exporter | Export traces to collectors |
| `@opentelemetry/instrumentation-http`     | `0.50.x` | HTTP tracing  | Auto-trace HTTP calls       |
| `@opentelemetry/instrumentation-fetch`    | `0.50.x` | Fetch tracing | Auto-trace fetch calls      |

### Scheduling

| Package | Version | Purpose          | Why This                          |
| ------- | ------- | ---------------- | --------------------------------- |
| `cron`  | `3.1.x` | Cron expressions | Parse and validate cron schedules |

### Security

| Package         | Version  | Purpose           | Why This                     |
| --------------- | -------- | ----------------- | ---------------------------- |
| `sanitize-html` | `2.13.x` | HTML sanitization | Prevent XSS in chat messages |

---

## 3.4 Development Dependencies

| Package                       | Version  | Purpose                  |
| ----------------------------- | -------- | ------------------------ |
| `eslint`                      | `8.57.x` | Linting                  |
| `eslint-config-next`          | `14.2.x` | Next.js ESLint rules     |
| `@types/node`                 | `20.x`   | Node.js type definitions |
| `@types/react`                | `18.3.x` | React type definitions   |
| `@types/react-dom`            | `18.3.x` | React DOM types          |
| `@types/sanitize-html`        | `2.x`    | sanitize-html types      |
| `prettier`                    | `3.3.x`  | Code formatting          |
| `prettier-plugin-tailwindcss` | `0.6.x`  | Tailwind class sorting   |

---

## 3.5 Testing Dependencies

| Package                       | Version  | Purpose                                |
| ----------------------------- | -------- | -------------------------------------- |
| `vitest`                      | `1.6.x`  | Unit/integration test runner           |
| `@testing-library/react`      | `16.x`   | React component testing                |
| `@testing-library/jest-dom`   | `6.4.x`  | DOM assertion matchers                 |
| `@testing-library/user-event` | `14.5.x` | User interaction simulation            |
| `msw`                         | `2.3.x`  | API mocking (Mock Service Worker)      |
| `playwright`                  | `1.44.x` | End-to-end browser testing             |
| `@playwright/test`            | `1.44.x` | Playwright test runner                 |
| `axe-playwright`              | `2.0.x`  | Automated accessibility testing (WCAG) |
| `@lhci/cli`                   | `0.13.x` | Lighthouse CI (performance budgets)    |

---

## 3.6 Infrastructure & Hosting

| Service                   | Tier                | Purpose                | Limits                                |
| ------------------------- | ------------------- | ---------------------- | ------------------------------------- |
| **Vercel**                | Hobby (Free)        | Frontend + API hosting | 100GB bandwidth, serverless functions |
| **Supabase**              | Free                | PostgreSQL database    | 500MB storage, 2 projects             |
| **Neon** (alternative)    | Free                | Serverless Postgres    | 512MB storage, auto-suspend           |
| **Cloudflare Workers AI** | Free                | LLM inference          | 10,000 neurons/day                    |
| **GitHub Actions**        | Free (public repos) | CI/CD + scheduled jobs | 2,000 min/month                       |

---

## 3.7 Browser APIs Used (No Dependencies)

| API                                  | Purpose                        | Fallback                |
| ------------------------------------ | ------------------------------ | ----------------------- |
| `Web Speech API` (SpeechRecognition) | Client-side STT                | Server-side Whisper     |
| `Web Speech API` (SpeechSynthesis)   | Client-side TTS                | Server-side ElevenLabs  |
| `MediaRecorder API`                  | Audio recording for server STT | Text-only mode          |
| `EventSource API`                    | SSE real-time updates          | Polling fallback        |
| `Web Audio API`                      | Audio visualization            | None (graceful degrade) |
| `Clipboard API`                      | Copy transcript                | Manual selection        |

---

## 3.8 Version Pinning Strategy

### Why Pin Versions?

- **Reproducibility**: Same `npm install` produces same `node_modules`
- **AI-assisted dev**: AI agents need exact versions to generate correct code
- **No surprise breaks**: Patch updates don't break the build

### Pinning Rules

1. **Major + Minor pinned** (`14.2.x`): Allow patch updates for security
2. **Use `package-lock.json`**: Always commit the lockfile
3. **Dependabot / Renovate**: Automate update PRs (but review before merge)
4. **Node.js version**: Pinned in `.nvmrc`:
   ```
   20.12.0
   ```

---

## 3.9 package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```
