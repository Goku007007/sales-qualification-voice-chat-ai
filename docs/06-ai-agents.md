# 06 — AI Agents Documentation

> Custom state-machine orchestration, prompt templates, structured extraction, guardrails, and scoring.

---

## 6.1 Orchestration Architecture

### Why Not Raw LLM Chains?

| Raw LLM Chain            | State-Machine Orchestration |
| ------------------------ | --------------------------- |
| No state tracking        | Explicit state per session  |
| Can skip/loop steps      | Enforced transition rules   |
| Single LLM call per turn | Multi-step with validation  |
| No retry semantics       | Per-node error handling     |
| Opaque behavior          | Observable & testable       |

### Why Custom (Not LangGraph)?

> LangGraph is a pre-1.0 library with a changing API. For a portfolio project, building a ~200-line orchestrator from scratch demonstrates deeper understanding of the pattern than installing a dependency. The custom engine supports the same concepts: `addNode`, `addEdge`, `addConditionalEdges`, and `compile`.

### Custom StateGraph Engine

```typescript
// src/lib/orchestrator/stateGraph.ts

type NodeFn<S> = (state: S) => Promise<Partial<S>>;
type RouterFn<S> = (state: S) => string;

interface Edge {
  from: string;
  to: string | '__end__';
}

interface ConditionalEdge<S> {
  from: string;
  router: RouterFn<S>;
  routes: Record<string, string>;
}

export class StateGraph<S> {
  private nodes = new Map<string, NodeFn<S>>();
  private edges: Edge[] = [];
  private conditionalEdges: ConditionalEdge<S>[] = [];
  private entryPoint: string | null = null;

  addNode(name: string, fn: NodeFn<S>): this {
    this.nodes.set(name, fn);
    return this;
  }

  addEdge(from: string, to: string): this {
    if (from === '__start__') {
      this.entryPoint = to;
    } else {
      this.edges.push({ from, to });
    }
    return this;
  }

  addConditionalEdges(from: string, router: RouterFn<S>, routes: Record<string, string>): this {
    this.conditionalEdges.push({ from, router, routes });
    return this;
  }

  compile() {
    return {
      run: async (
        initialState: S,
        options?: { onNodeComplete?: (node: string, state: S) => void },
      ): Promise<S> => {
        let state = { ...initialState };
        let currentNode = this.entryPoint!;

        while (currentNode && currentNode !== '__end__') {
          const nodeFn = this.nodes.get(currentNode);
          if (!nodeFn) throw new Error(`Unknown node: ${currentNode}`);

          const updates = await nodeFn(state);
          state = { ...state, ...updates };
          options?.onNodeComplete?.(currentNode, state);

          // Find next node
          const condEdge = this.conditionalEdges.find((e) => e.from === currentNode);
          if (condEdge) {
            const routeKey = condEdge.router(state);
            currentNode = condEdge.routes[routeKey] ?? '__end__';
          } else {
            const edge = this.edges.find((e) => e.from === currentNode);
            currentNode = edge?.to ?? '__end__';
          }
        }

        return state;
      },
    };
  }
}
```

### Graph Definition

```typescript
// src/lib/orchestrator/graph.ts
import { StateGraph } from './stateGraph';

const qualificationGraph = new StateGraph<SessionState>()
  .addNode('consent', consentNode)
  .addNode('opening', openingNode)
  .addNode('qualify_loop', qualifyLoopNode)
  .addNode('score', scoreNode)
  .addNode('route', routeNode)
  .addNode('actions', actionsNode)
  .addNode('followup', followUpNode)

  .addEdge('__start__', 'consent')
  .addConditionalEdges('consent', consentRouter, {
    continue: 'opening',
    decline: '__end__',
  })
  .addEdge('opening', 'qualify_loop')
  .addConditionalEdges('qualify_loop', qualifyRouter, {
    next_question: 'qualify_loop',
    follow_up: 'qualify_loop',
    complete: 'score',
  })
  .addEdge('score', 'route')
  .addConditionalEdges('route', routeRouter, {
    hot: 'actions',
    warm: 'actions',
    cold: 'actions',
    risk: 'actions',
  })
  .addEdge('actions', 'followup')
  .addEdge('followup', '__end__');

export const graph = qualificationGraph.compile();
```

### Session State Schema

```typescript
interface SessionState {
  // Identity
  sessionId: string;
  industry: IndustryType;

  // Conversation
  messages: ChatMessage[];
  currentQuestionIndex: number;
  totalQuestions: number;

  // Extracted data
  leadFields: Partial<LeadFields>;
  extractionConfidences: Record<string, number>;

  // Scoring
  score: number | null;
  scoreLabel: 'cold' | 'warm' | 'hot' | null;
  scoreReasons: string[];

  // Routing
  routeDecision: 'hot' | 'warm' | 'cold' | 'risk' | null;

  // Consent
  consentGiven: boolean;
  consentTimestamp: string | null;

  // Tool execution tracking
  adapterResults: AdapterResult[];
  pendingActions: ActionItem[];

  // Follow-up
  followUps: FollowUp[];

  // Meta
  currentState: WorkflowState;
  stateHistory: StateTransition[];
  errorCount: number;
  lastError: string | null;
}
```

---

## 6.2 Node Specifications

### 6.2.1 Consent Node

**Purpose:** Verify user consent before any data collection.

**Input:** User's first message (expected: "yes"/"no"/affirmative/negative)

**Logic:**

```typescript
async function consentNode(state: SessionState): Promise<Partial<SessionState>> {
  const lastMessage = state.messages[state.messages.length - 1];

  // Use LLM to classify consent (handles natural language)
  const consent = await llm.generateStructured({
    systemPrompt: CONSENT_CLASSIFIER_PROMPT,
    messages: state.messages,
    schema: z.object({
      consented: z.boolean(),
      confidence: z.number(),
    }),
  });

  if (consent.consented) {
    return {
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    };
  } else {
    return { consentGiven: false };
  }
}

function consentRouter(state: SessionState): 'continue' | 'decline' {
  return state.consentGiven ? 'continue' : 'decline';
}
```

**Events emitted:** `consent_given` or `consent_declined`

### 6.2.2 Opening Node

**Purpose:** Deliver the opening message and set expectations.

**Logic:**

```typescript
async function openingNode(state: SessionState): Promise<Partial<SessionState>> {
  const industryPack = getIndustryPack(state.industry);
  const openingMessage = await llm.generateCompletion({
    systemPrompt: OPENING_PROMPT(industryPack),
    messages: state.messages,
  });

  return {
    messages: [
      ...state.messages,
      {
        role: 'agent',
        content: openingMessage.content,
      },
    ],
    currentQuestionIndex: 0,
  };
}
```

### 6.2.3 Qualify Loop Node

**Purpose:** Ask qualification questions, extract structured fields, validate completeness.

**Logic:**

```typescript
async function qualifyLoopNode(state: SessionState): Promise<Partial<SessionState>> {
  const industryPack = getIndustryPack(state.industry);
  const currentQ = industryPack.questions[state.currentQuestionIndex];

  // Step 1: Extract fields from user's latest answer
  const extraction = await llm.generateStructured({
    systemPrompt: EXTRACTION_PROMPT(currentQ, industryPack),
    messages: state.messages,
    schema: LeadFieldsExtractionSchema,
  });

  // Step 2: Validate extraction
  const validation = validateExtraction(extraction, state.leadFields);

  // Step 3: Determine next action
  if (validation.needsFollowUp) {
    // Ask a follow-up question for missing/ambiguous fields
    const followUp = await llm.generateCompletion({
      systemPrompt: FOLLOW_UP_PROMPT(validation.missingFields),
      messages: state.messages,
    });
    return {
      messages: [...state.messages, { role: 'agent', content: followUp.content }],
      leadFields: { ...state.leadFields, ...extraction.fields },
    };
  }

  // Step 4: Move to next question or complete
  const nextIndex = state.currentQuestionIndex + 1;
  if (nextIndex >= state.totalQuestions) {
    // All questions answered
    return {
      leadFields: { ...state.leadFields, ...extraction.fields },
      currentQuestionIndex: nextIndex,
    };
  }

  // Ask next question
  const nextQ = industryPack.questions[nextIndex];
  const nextMessage = await llm.generateCompletion({
    systemPrompt: NEXT_QUESTION_PROMPT(nextQ, state.leadFields),
    messages: state.messages,
  });

  return {
    messages: [...state.messages, { role: 'agent', content: nextMessage.content }],
    leadFields: { ...state.leadFields, ...extraction.fields },
    currentQuestionIndex: nextIndex,
  };
}

function qualifyRouter(state: SessionState): 'next_question' | 'follow_up' | 'complete' {
  if (state.currentQuestionIndex >= state.totalQuestions) return 'complete';
  // Additional logic for follow-ups
  return 'next_question';
}
```

**Events emitted:** `question_asked`, `field_extracted`, `follow_up_triggered`

### 6.2.4 Score Node

**Purpose:** Compute lead score using rule-based baseline + LLM justification.

**Scoring Algorithm:**

```typescript
async function scoreNode(state: SessionState): Promise<Partial<SessionState>> {
  const industryPack = getIndustryPack(state.industry);
  const rubric = industryPack.scoringRubric;

  // Rule-based scoring
  let score = 0;
  const reasons: string[] = [];

  // Budget weight (0-25 points)
  score += scoreField(state.leadFields.budget_range, rubric.budget);
  // Timeline weight (0-25 points)
  score += scoreField(state.leadFields.timeline, rubric.timeline);
  // Authority weight (0-25 points)
  score += scoreField(state.leadFields.decision_maker, rubric.authority);
  // Need weight (0-25 points)
  score += scoreField(state.leadFields.use_case, rubric.need);

  // LLM-assisted justification (optional enrichment)
  const justification = await llm.generateStructured({
    systemPrompt: SCORING_PROMPT(rubric),
    messages: state.messages,
    schema: z.object({
      adjustedScore: z.number().min(0).max(100),
      reasons: z.array(z.string()),
    }),
  });

  // Blend: 70% rule-based, 30% LLM-adjusted
  const finalScore = Math.round(score * 0.7 + justification.adjustedScore * 0.3);
  const label = finalScore >= 67 ? 'hot' : finalScore >= 34 ? 'warm' : 'cold';

  return {
    score: finalScore,
    scoreLabel: label,
    scoreReasons: [...reasons, ...justification.reasons],
  };
}
```

### 6.2.5 Route Node

**Purpose:** Decide next steps based on score and risk factors.

```typescript
async function routeNode(state: SessionState): Promise<Partial<SessionState>> {
  // Check for risk/compliance keywords
  const riskDetected = detectRiskKeywords(state.messages, state.industry);

  let decision: 'hot' | 'warm' | 'cold' | 'risk';
  if (riskDetected) {
    decision = 'risk';
  } else if (state.scoreLabel === 'hot' || state.scoreLabel === 'warm') {
    decision = state.scoreLabel;
  } else {
    decision = 'cold';
  }

  return { routeDecision: decision };
}
```

### 6.2.6 Actions Node

**Purpose:** Execute tool calls (CRM, tickets, calendar) through adapters.

```typescript
async function actionsNode(state: SessionState): Promise<Partial<SessionState>> {
  const actions: ActionItem[] = [];

  // Always: upsert CRM record
  const crmResult = await crmAdapter.upsertLead(
    {
      sessionId: state.sessionId,
      industry: state.industry,
      score: state.score!,
      fields: state.leadFields,
    },
    `crm:${state.sessionId}:upsert:final`,
  );
  actions.push({ type: 'crm_upsert', result: crmResult });

  // Conditional: create tickets
  if (state.leadFields.decision_maker === 'not_me') {
    const ticket = await ticketAdapter.createTickets(
      [
        {
          title: 'Stakeholder invitation needed',
          type: 'stakeholder_invite',
          sessionId: state.sessionId,
        },
      ],
      `ticket:${state.sessionId}:stakeholder`,
    );
    actions.push({ type: 'ticket_create', result: ticket });
  }

  if (state.routeDecision === 'risk') {
    const ticket = await ticketAdapter.createTickets(
      [
        {
          title: 'Risk/compliance review required',
          type: 'risk_review',
          sessionId: state.sessionId,
        },
      ],
      `ticket:${state.sessionId}:risk`,
    );
    actions.push({ type: 'ticket_create', result: ticket });
  }

  // Hot/Warm: propose meeting
  if (state.routeDecision === 'hot' || state.routeDecision === 'warm') {
    const slots = await calendarAdapter.proposeSlots({
      durationMinutes: 30,
      daysAhead: 7,
      timezone: 'America/Chicago',
    });
    actions.push({ type: 'meeting_proposed', result: slots });
  }

  return { adapterResults: actions };
}
```

### 6.2.7 Follow-Up Node

**Purpose:** Schedule automated follow-up actions for non-converted leads.

```typescript
async function followUpNode(state: SessionState): Promise<Partial<SessionState>> {
  if (
    state.routeDecision === 'cold' ||
    !state.adapterResults.some((a) => a.type === 'meeting_booked')
  ) {
    const followUps = [
      { day: 1, type: 'friendly_ping', description: 'Friendly check-in' },
      { day: 3, type: 'value_add', description: 'Share relevant case study' },
      { day: 7, type: 'close_loop', description: 'Close-loop: still interested?' },
    ];

    for (const fu of followUps) {
      await scheduler.scheduleJob({
        sessionId: state.sessionId,
        type: fu.type,
        executeAt: addDays(new Date(), fu.day),
        payload: fu,
      });
    }

    return { followUps };
  }
  return {};
}
```

---

## 6.3 Prompt Templates

### Design Principles

1. **Role-specific**: Each prompt has a clear role ("You are a sales qualification agent for {industry}")
2. **Constrained**: Include explicit constraints ("Ask ONLY the provided question", "Do NOT skip ahead")
3. **Schema-aware**: Extraction prompts include the Zod schema description
4. **Context-aware**: Include industry pack context (FAQ, pricing, objections)
5. **Examples included**: Few-shot examples for extraction accuracy

### Key Prompts

#### Consent Classifier

```
You are a consent classifier. Analyze the user's response and determine if they are giving consent to proceed.

Output ONLY valid JSON:
{ "consented": true/false, "confidence": 0.0-1.0 }

Examples of consent: "yes", "sure", "go ahead", "okay", "let's do it"
Examples of decline: "no", "not interested", "stop", "cancel"
```

#### Qualification Question

```
You are a professional sales qualification agent for the {industry} industry.

Currently asking: {currentQuestion}
Questions remaining: {remaining}
Already extracted: {extractedFieldsSummary}

Rules:
- Ask ONLY the current question. Do NOT skip to the next question.
- Be conversational and natural, not robotic.
- If the user's answer is unclear, ask ONE follow-up for clarity.
- Do NOT make up information the user hasn't provided.
- Keep responses under 3 sentences.
```

#### Field Extraction

```
Extract structured fields from the user's response to a sales qualification question.

Question asked: {question}
User response: {response}
Industry: {industry}

Extract into this schema:
{zodSchemaDescription}

Rules:
- Only extract fields explicitly mentioned or clearly implied.
- Set confidence to 0.0-1.0 based on how explicit the information is.
- If a field is not mentioned, set it to null.
- Do NOT infer or guess values.
```

#### Scoring Justification

```
You are a lead scoring assistant. Given the conversation and extracted lead data, provide a score assessment.

Extracted fields: {fields}
Industry rubric: {rubric}
Conversation summary: {summary}

Provide:
1. An adjusted score (0-100) based on the conversation quality and engagement.
2. A list of 3-5 specific reasons for the score.

Score ranges: Cold (0-33), Warm (34-66), Hot (67-100)
```

---

## 6.4 Structured Extraction Schemas

```typescript
// Core lead fields extraction schema
const LeadFieldsExtractionSchema = z.object({
  budget_range: z.string().nullable().describe('Budget range, e.g., "$10k-$50k"'),
  timeline: z.string().nullable().describe('Implementation timeline, e.g., "Q2 2026"'),
  use_case: z.string().nullable().describe('Primary use case or need'),
  decision_maker: z
    .enum(['yes', 'no', 'partial', 'unknown'])
    .nullable()
    .describe('Is this person the decision maker?'),
  current_solution: z.string().nullable().describe('Current solution/competitor'),
  pain_points: z.string().nullable().describe('Key pain points mentioned'),
  company_size: z.string().nullable().describe('Company size (employees or revenue)'),
  urgency: z
    .enum(['low', 'medium', 'high', 'critical'])
    .nullable()
    .describe('How urgently do they need a solution?'),

  // Extraction metadata
  confidence: z.number().min(0).max(1).describe('Overall extraction confidence'),
  fieldsExtracted: z.array(z.string()).describe('Which fields were extracted this turn'),
});
```

---

## 6.5 Guardrails

### Consent Gate

- **First state** in every session — no data before consent
- LLM-classified (not just keyword match) for natural language handling
- Consent event is immutable in audit log

### PII Redaction

```typescript
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

function redactPII(text: string): { redacted: string; piiFound: PIIMatch[] } {
  let redacted = text;
  const piiFound: PIIMatch[] = [];
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        redacted = redacted.replace(match, `[${type.toUpperCase()}_REDACTED]`);
        piiFound.push({ type, position: text.indexOf(match) });
      });
    }
  }
  return { redacted, piiFound };
}
```

### Content Filter

- Detects off-topic requests, prompt injection attempts, disallowed topics
- Routes to safe refusal + handoff ticket creation

### Policy Engine

```typescript
interface PolicyRule {
  name: string;
  condition: (state: SessionState, message: string) => boolean;
  action: 'block' | 'warn' | 'flag' | 'redirect';
  message: string;
}

const POLICIES: PolicyRule[] = [
  {
    name: 'max_questions_exceeded',
    condition: (state) => state.currentQuestionIndex > state.totalQuestions + 2,
    action: 'redirect',
    message: 'Moving to scoring phase.',
  },
  {
    name: 'healthcare_compliance',
    condition: (state, msg) => state.industry === 'healthcare' && containsHIPAAKeywords(msg),
    action: 'flag',
    message: 'Compliance review flagged.',
  },
];
```

---

## 6.6 RAG (Retrieval-Augmented Generation)

### Knowledge Base per Industry Pack

Each industry pack includes a mini knowledge base:

- FAQ entries (10-20 per industry)
- Pricing information
- Common objections + responses
- Case study snippets

### Retrieval Flow

```
User question during qualification
    │
    ▼
┌─────────────────┐
│ Embed question   │
│ (same LLM       │
│  provider)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vector search    │
│ (in-memory for  │
│  demo; pgvector │
│  for production) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Top-K results    │
│ injected into   │
│ system prompt   │
└─────────────────┘
```

> **Note:** For the demo, knowledge base entries are stored as JSON and searched with simple text similarity. Production would use pgvector.
