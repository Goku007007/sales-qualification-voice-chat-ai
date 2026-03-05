# 08 — Workflow Documentation

> State machine definition, industry packs, qualification flow, routing logic, and follow-up scheduling.

---

## 8.1 Workflow Overview

The qualification workflow is a **directed acyclic graph (DAG)** with one controlled loop (qualify_loop). Every session traverses the same path, ensuring predictable, auditable behavior.

```
START → CONSENT → OPENING → QUALIFY_LOOP (×5) → SCORE → ROUTE → ACTIONS → FOLLOWUP → END
```

### Why a State Machine?

| Without State Machine                          | With State Machine                   |
| ---------------------------------------------- | ------------------------------------ |
| Agent decides what to ask next (unpredictable) | Fixed question order per industry    |
| Can skip consent                               | Consent is enforced first state      |
| No retry boundary                              | Each node has its own error handling |
| Can't track "where are we?"                    | `currentState` always known          |
| Testing is integration-only                    | Each node is unit-testable           |

---

## 8.2 State Definitions

```typescript
enum WorkflowState {
  CONSENT = 'CONSENT',
  OPENING = 'OPENING',
  QUALIFY_LOOP = 'QUALIFY_LOOP',
  SCORE = 'SCORE',
  ROUTE = 'ROUTE',
  ACTIONS = 'ACTIONS',
  FOLLOWUP_SCHEDULED = 'FOLLOWUP_SCHEDULED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}
```

### State Details

| State                | Entry Condition       | Exit Condition                        | Max Duration   | Retry?             |
| -------------------- | --------------------- | ------------------------------------- | -------------- | ------------------ |
| `CONSENT`            | Session created       | User response classified              | 5 min timeout  | No (end session)   |
| `OPENING`            | Consent given         | Opening message delivered             | 10s            | Yes (1 retry)      |
| `QUALIFY_LOOP`       | Opening complete      | All questions answered or max reached | 2 min/question | Yes (per question) |
| `SCORE`              | Qualify loop complete | Score computed                        | 15s            | Yes (2 retries)    |
| `ROUTE`              | Score computed        | Route decision made                   | 5s             | No (deterministic) |
| `ACTIONS`            | Route decided         | All adapters called                   | 30s            | Yes (per adapter)  |
| `FOLLOWUP_SCHEDULED` | Actions complete      | Follow-ups scheduled                  | 10s            | Yes (1 retry)      |
| `COMPLETED`          | Follow-ups done       | —                                     | —              | —                  |
| `ERROR`              | Unrecoverable error   | Manual intervention                   | —              | —                  |

---

## 8.3 Industry Packs

### What Is an Industry Pack?

A JSON configuration bundle that customizes the qualification flow for a specific industry:

```typescript
interface IndustryPack {
  id: IndustryType;
  name: string;
  description: string;
  icon: string;
  color: string;

  // Qualification
  questions: QualificationQuestion[];
  scoringRubric: ScoringRubric;

  // Templates
  ticketTemplates: TicketTemplate[];
  followUpTemplates: FollowUpTemplate[];

  // Knowledge base (for RAG)
  knowledgeBase: KnowledgeEntry[];

  // Prompt customization
  agentPersona: string;
  industryTerms: string[];
}
```

### Industry Pack: SaaS

```typescript
const SAAS_PACK: IndustryPack = {
  id: 'saas',
  name: 'SaaS / Software',
  description: 'B2B software and cloud services qualification',
  icon: '💻',
  color: '#6366F1', // Indigo

  questions: [
    {
      id: 'q1_use_case',
      text: "What's the main challenge you're looking to solve with our platform?",
      targetField: 'use_case',
      followUpIf: 'vague',
      followUpPrompt: 'Could you give me a specific example of where this is causing friction?',
    },
    {
      id: 'q2_current_solution',
      text: 'What are you currently using to handle this? Or is this a new initiative?',
      targetField: 'current_solution',
      followUpIf: 'none',
      followUpPrompt: 'No worries! How are you managing it today — spreadsheets, manual process?',
    },
    {
      id: 'q3_timeline',
      text: "What's your ideal timeline to get something in place?",
      targetField: 'timeline',
      followUpIf: 'vague',
      followUpPrompt: 'Is this more of a this-quarter urgency or a longer-term evaluation?',
    },
    {
      id: 'q4_budget',
      text: 'Do you have a budget range allocated for this type of solution?',
      targetField: 'budget_range',
      followUpIf: 'missing',
      followUpPrompt: 'Even a rough range helps — are we talking under $10k, $10-50k, or $50k+?',
    },
    {
      id: 'q5_decision',
      text: 'Who else would be involved in making this decision?',
      targetField: 'decision_maker',
      followUpIf: 'unclear',
      followUpPrompt:
        'Would you be the primary decision-maker, or would we need to loop in someone else?',
    },
  ],

  scoringRubric: {
    budget: { weight: 25, tiers: { high: '$50k+', medium: '$10k-$50k', low: '<$10k' } },
    timeline: {
      weight: 25,
      tiers: { high: 'This quarter', medium: 'Next quarter', low: '6+ months' },
    },
    authority: {
      weight: 25,
      tiers: { high: 'Decision maker', medium: 'Influencer', low: 'Researcher' },
    },
    need: {
      weight: 25,
      tiers: { high: 'Active pain point', medium: 'Exploring', low: 'Just browsing' },
    },
  },

  ticketTemplates: [
    {
      type: 'stakeholder_invite',
      title: '[SaaS] Invite decision-maker: {company}',
      priority: 'high',
    },
    {
      type: 'risk_review',
      title: '[SaaS] Security/compliance review: {company}',
      priority: 'high',
    },
    { type: 'handoff', title: '[SaaS] Warm handoff to AE: {company}', priority: 'medium' },
  ],

  followUpTemplates: [
    {
      day: 1,
      type: 'friendly_ping',
      template: 'Hi! Just following up on our conversation about {use_case}.',
    },
    {
      day: 3,
      type: 'value_add',
      template: 'I thought you might find this case study relevant: {case_study_link}',
    },
    { day: 7, type: 'close_loop', template: 'Should I keep your file open or close it for now?' },
  ],

  knowledgeBase: [
    {
      topic: 'pricing',
      content: 'Plans start at $49/mo for Starter, $149/mo for Pro, custom for Enterprise.',
    },
    {
      topic: 'integrations',
      content: 'We integrate with Salesforce, HubSpot, Slack, and 200+ tools via Zapier.',
    },
    { topic: 'security', content: 'SOC 2 Type II certified, GDPR compliant, SSO via SAML 2.0.' },
    { topic: 'onboarding', content: 'Typical onboarding takes 2-4 weeks with a dedicated CSM.' },
  ],

  agentPersona: 'You are a friendly, professional SaaS sales development representative.',
  industryTerms: ['MRR', 'ARR', 'churn', 'seats', 'API', 'integration', 'SSO', 'SOC 2'],
};
```

### Industry Pack: Real Estate

```typescript
const REAL_ESTATE_PACK: IndustryPack = {
  id: 'real_estate',
  name: 'Real Estate',
  description: 'Property services and real estate technology qualification',
  icon: '🏠',
  color: '#10B981', // Emerald

  questions: [
    {
      id: 'q1',
      text: 'What type of property are you looking to buy, sell, or manage?',
      targetField: 'use_case',
    },
    { id: 'q2', text: 'What area or market are you focused on?', targetField: 'current_solution' },
    {
      id: 'q3',
      text: "What's your timeline — are you looking to move quickly or still exploring?",
      targetField: 'timeline',
    },
    {
      id: 'q4',
      text: 'Do you have a budget range in mind for this investment?',
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: 'Are you the primary decision-maker, or are there partners involved?',
      targetField: 'decision_maker',
    },
  ],
  // ... (similar structure to SaaS with industry-specific rubric, templates, knowledge base)
};
```

### Industry Pack: Healthcare

```typescript
const HEALTHCARE_PACK: IndustryPack = {
  id: 'healthcare',
  name: 'Healthcare',
  description: 'Healthcare technology and medical services qualification',
  icon: '🏥',
  color: '#EF4444', // Red

  questions: [
    {
      id: 'q1',
      text: 'What healthcare challenge are you looking to address with technology?',
      targetField: 'use_case',
    },
    {
      id: 'q2',
      text: 'What systems are you currently using for this?',
      targetField: 'current_solution',
    },
    {
      id: 'q3',
      text: "What's your timeline for implementation — is there a compliance deadline?",
      targetField: 'timeline',
    },
    {
      id: 'q4',
      text: 'Has budget been allocated for this initiative?',
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: 'Who are the key stakeholders involved in this decision?',
      targetField: 'decision_maker',
    },
  ],
  // ... with HIPAA-aware guardrails and compliance-focused rubric
};
```

### Industry Pack: E-Commerce

```typescript
const ECOMMERCE_PACK: IndustryPack = {
  id: 'ecommerce',
  name: 'E-Commerce',
  description: 'Online retail and marketplace qualification',
  icon: '🛒',
  color: '#F59E0B', // Amber

  questions: [
    {
      id: 'q1',
      text: "What's the biggest challenge you're facing with your online store?",
      targetField: 'use_case',
    },
    { id: 'q2', text: 'Which platform are you currently using?', targetField: 'current_solution' },
    {
      id: 'q3',
      text: 'When are you looking to make changes — before the next peak season?',
      targetField: 'timeline',
    },
    {
      id: 'q4',
      text: "What's your monthly revenue range so I can recommend the right tier?",
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: "Are you the person who'll decide on this, or should we include someone else?",
      targetField: 'decision_maker',
    },
  ],
  // ...
};
```

### Industry Pack: Consulting

```typescript
const CONSULTING_PACK: IndustryPack = {
  id: 'consulting',
  name: 'Consulting',
  description: 'Professional services and management consulting qualification',
  icon: '📊',
  color: '#8B5CF6', // Violet

  questions: [
    {
      id: 'q1',
      text: 'What type of consulting engagement are you looking for?',
      targetField: 'use_case',
    },
    {
      id: 'q2',
      text: 'Have you worked with consultants on this type of project before?',
      targetField: 'current_solution',
    },
    { id: 'q3', text: 'When do you need this engagement to start?', targetField: 'timeline' },
    {
      id: 'q4',
      text: 'Do you have a budget range for consulting services?',
      targetField: 'budget_range',
    },
    {
      id: 'q5',
      text: "Who's the executive sponsor for this initiative?",
      targetField: 'decision_maker',
    },
  ],
  // ...
};
```

---

## 8.4 Routing Logic

```typescript
function determineRoute(state: SessionState): RouteDecision {
  // Priority 1: Risk detection (always overrides)
  if (detectRiskKeywords(state)) return 'RISK';

  // Priority 2: Score-based routing
  if (state.score! >= 67) return 'HOT';
  if (state.score! >= 34) return 'WARM';
  return 'COLD';
}

// Route → Actions mapping
const ROUTE_ACTIONS: Record<RouteDecision, ActionPlan> = {
  HOT: {
    crmUpdate: true,
    proposeMeeting: true,
    createTickets: ['handoff'],
    followUps: false, // Meeting replaces follow-ups
    closingMessage: 'meeting_proposal',
  },
  WARM: {
    crmUpdate: true,
    proposeMeeting: true,
    createTickets: [],
    followUps: true, // Follow-ups as backup
    closingMessage: 'meeting_proposal_soft',
  },
  COLD: {
    crmUpdate: true,
    proposeMeeting: false,
    createTickets: [],
    followUps: true,
    closingMessage: 'nurture_close',
  },
  RISK: {
    crmUpdate: true,
    proposeMeeting: false,
    createTickets: ['risk_review', 'handoff'],
    followUps: false,
    closingMessage: 'risk_handoff',
  },
};
```

---

## 8.5 Follow-Up Scheduling

### Schedule Definition

| Day | Type            | Description                                  | Stop Condition   |
| --- | --------------- | -------------------------------------------- | ---------------- |
| 1   | `friendly_ping` | Friendly check-in referencing their use case | User replies     |
| 3   | `value_add`     | Share industry-relevant case study or FAQ    | Meeting booked   |
| 7   | `close_loop`    | "Should I close your file?"                  | Opt-out received |

### Job Execution Logic

```typescript
async function executeFollowUpJob(job: FollowUpJob): Promise<void> {
  // Check stop conditions
  const session = await getSession(job.sessionId);

  if (session.outcome === 'MEETING_BOOKED') {
    await updateJobStatus(job.id, 'CANCELLED', 'Meeting already booked');
    return;
  }

  // Check if user has replied since last follow-up
  const recentMessages = await getMessagesSince(job.sessionId, job.createdAt);
  if (recentMessages.some((m) => m.role === 'USER')) {
    await updateJobStatus(job.id, 'CANCELLED', 'User already replied');
    return;
  }

  // Execute the follow-up
  const template = getFollowUpTemplate(session.industry, job.type);
  const message = interpolateTemplate(template, session.leadFields);

  await emailAdapter.sendRecap(
    {
      to: 'demo@example.com', // Mock in demo
      sessionSummary: { message },
      templateId: job.type,
    },
    `followup:${job.sessionId}:day${job.day}`,
  );

  await updateJobStatus(job.id, 'COMPLETED');
  await logEvent({
    sessionId: job.sessionId,
    type: 'followup_executed',
    description: `Day ${job.day} ${job.type} sent`,
  });
}
```

### Cron Runner

```typescript
// Runs every 5 minutes (Cloudflare Cron or GitHub Actions)
async function processFollowUpJobs(): Promise<void> {
  const dueJobs = await prisma.followUpJob.findMany({
    where: {
      status: 'SCHEDULED',
      executeAt: { lte: new Date() },
    },
    orderBy: { executeAt: 'asc' },
    take: 10, // Process in batches
  });

  for (const job of dueJobs) {
    try {
      await updateJobStatus(job.id, 'RUNNING');
      await executeFollowUpJob(job);
    } catch (error) {
      const shouldRetry = job.retryCount < 3;
      await updateJobStatus(job.id, shouldRetry ? 'SCHEDULED' : 'FAILED', error.message);
      if (shouldRetry) {
        await incrementRetryCount(job.id);
      }
    }
  }
}
```

---

## 8.6 Error Recovery

### Per-Node Error Handling

```typescript
async function executeNodeWithRecovery(
  sessionId: string,
  node: StateNode,
  input: NodeInput,
  maxRetries: number = 2,
): Promise<NodeOutput> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const output = await node.execute(input);
      return output;
    } catch (error) {
      await logEvent({
        sessionId,
        type: 'node_error',
        description: `Error in ${node.name} (attempt ${attempt + 1})`,
        metadata: { error: error.message, attempt },
      });

      if (attempt === maxRetries) {
        // Move to ERROR state
        await updateSessionState(sessionId, 'ERROR');
        throw error;
      }

      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 500);
    }
  }
}
```

### Session Recovery

If a session enters ERROR state:

1. Log error details in event log
2. Send error event via SSE to client
3. Client shows "Something went wrong" with option to retry from last stable state
4. On retry: revert to last successful state, re-execute current node

---

## 8.7 Conversation Flow Example

```
Agent: "Welcome! This is a demo of our AI sales qualification system.
        Do I have your consent to proceed?"                              [CONSENT]
User:  "Yes, go ahead"
        → consent_given event logged

Agent: "Great! I'll ask 5 quick questions to understand your needs.
        Let's get started!"                                              [OPENING]

Agent: "What's the main challenge you're looking to solve with
        our platform?"                                                   [QUALIFY_LOOP q1]
User:  "We need better pipeline visibility for our 50-person sales team"
        → field_extracted: use_case = "pipeline visibility"
        → field_extracted: company_size = "50-person sales team"

Agent: "What are you currently using to handle this?"                    [QUALIFY_LOOP q2]
User:  "We've been using spreadsheets and it's a mess"
        → field_extracted: current_solution = "spreadsheets"
        → field_extracted: pain_points = "manual, messy process"

Agent: "What's your ideal timeline to get something in place?"           [QUALIFY_LOOP q3]
User:  "We need something by end of Q2"
        → field_extracted: timeline = "Q2 2026"

Agent: "Do you have a budget range allocated for this?"                  [QUALIFY_LOOP q4]
User:  "We're thinking around 30-40k"
        → field_extracted: budget_range = "$30k-$40k"

Agent: "Who else would be involved in making this decision?"             [QUALIFY_LOOP q5]
User:  "I'm the VP of Sales, so it's my call"
        → field_extracted: decision_maker = "yes"

        → SCORE: 82 (Hot)                                               [SCORE]
        → ROUTE: Hot → propose meeting                                   [ROUTE]

Agent: "Based on our conversation, you'd be a great fit!                 [ACTIONS]
        I'd love to set up a 30-minute demo. Here are some available
        times this week..."
        → crm_upserted event
        → meeting_proposed event

                                                                          [FOLLOWUP]
        → No follow-ups needed (meeting proposed to Hot lead)

Agent: "Thanks for your time! You'll receive a calendar invite shortly." [COMPLETED]
        → session_completed event
```
