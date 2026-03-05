# 04 — Frontend Documentation

> UI components, pages, state management, design system, voice UI, and real-time updates.
>
> **Reference UI**: See `docs/ui-reference.webp` and the generated mockup for the target design.

---

## 4.1 Page Structure

### 4.1.1 Pages Overview

| Route           | Page           | Description                                                 |
| --------------- | -------------- | ----------------------------------------------------------- |
| `/`             | Landing Page   | Full-screen experience: industry selection → session starts |
| `/session/[id]` | Session Page   | Live call + dashboard (split-panel)                         |
| `/analytics`    | Analytics Page | Funnel, drop-off, outcomes                                  |

---

### 4.1.2 Landing / Session Page — Combined Layout

> Based on the reference UI, the industry selector sits atop the session view. On landing, only the industry bar is prominent. Once selected, the full session UI appears below.

**Full Layout**:

```
┌────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Select Industry                           │  │
│  │  ┌────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──┐│  │
│  │  │ 💻     │ │ 🏠         │ │ 🏥         │ │ 🛒       │ │📊││  │
│  │  │ SaaS   │ │Real Estate │ │Healthcare  │ │E-Commerce│ │Co││  │
│  │  │ B2B SW │ │Property &  │ │Clinic /    │ │Online    │ │Bu││  │
│  │  │ qualif.│ │buyer       │ │service     │ │shop leads│ │co││  │
│  │  └────────┘ └────────────┘ └────────────┘ └──────────┘ └──┘│  │
│  │  ✅ Qualification model loaded   |  🔵 RAG Enabled          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────┬──────────────────────────────────────┐  │
│  │                      │                                      │  │
│  │  ● LIVE CALL  🔴     │  Lead Score    ⊙ Qualification       │  │
│  │  ▐▌ 🔊 ⧫ ≡          │               model loaded           │  │
│  │  ┃▌│▐▌▌│▐│▌│▐│▌▐ ┃  │      ╭─────────╮   Lead Details     │  │
│  │                      │     ╱   Warm    ╲   ─────────────    │  │
│  │  ┌────────────────┐  │ Low╱     85      ╲Hot Budget: $15k  │  │
│  │  │ Agent:         │  │    ╲─────────────╱   Timeline: 2-3M │  │
│  │  │ Hi Sarah, can  │  │                      Need: New CRM  │  │
│  │  │ I ask you a few│  │                      DM: John (CTO) │  │
│  │  │ quick questions │  │ Meeting Scheduled   Recent Events   │  │
│  │  │ to see if we're│  │ ──────────────────  ───────────────  │  │
│  │  │ a fit?         │  │ Demo Call w/ Sarah  ✅ Industry: SaaS│  │
│  │  └────────────────┘  │ Tue, 2:00 PM       ✅ Consent given  │  │
│  │                      │ [Reschedule][Cancel] ✅ Lead qualified│  │
│  │  Agent: Sure, sounds │                                      │  │
│  │  good.               │ Follow-Up Schedule                   │  │
│  │                      │ ──────────────────                   │  │
│  │  Agent: What's your  │ In 1 Day: Send Friendly Reminder     │  │
│  │  current project     │ In 3 Days: Share Case Study          │  │
│  │  need?               │ In 7 Days: Final Check-In            │  │
│  │                      │                                      │  │
│  │  Lead: We're looking │                                      │  │
│  │  for a new CRM sol.  │                                      │  │
│  │                      │                                      │  │
│  │  ┌────────────────┐  │                                      │  │
│  │  │ 🎧 Speak │ 🎤 │  │                                      │  │
│  │  │    ⌨️ Type     │  │                                      │  │
│  │  └────────────────┘  │                                      │  │
│  └──────────────────────┴──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4.2 Industry Selector Bar

### Layout

- Full-width bar at the top of the page
- Title: **"Select Industry"** (left-aligned, white text)
- 5 horizontal tiles in a row, each a glassmorphism card

### Industry Tiles

| Industry        | Icon        | Subtitle                   | Color               |
| --------------- | ----------- | -------------------------- | ------------------- |
| **SaaS**        | 💻 Laptop   | B2B software qualification | `#6366F1` (Indigo)  |
| **Real Estate** | 🏠 House    | Property inquiry & buyer   | `#10B981` (Emerald) |
| **Healthcare**  | 🏥 Hospital | Clinic / service intake    | `#EF4444` (Red)     |
| **E-Commerce**  | 🛒 Cart     | Online shop leads          | `#F59E0B` (Amber)   |
| **Consulting**  | 📊 Chart    | Business coaching & co...  | `#8B5CF6` (Violet)  |

### Tile Component Spec

```typescript
interface IndustryTileProps {
  id: IndustryType;
  name: string;
  subtitle: string;
  icon: string; // Lucide icon name
  color: string; // Accent color (hex)
  isSelected: boolean;
  onClick: (id: IndustryType) => void;
}
```

**Tile Design**:

- Dark glassmorphism card (`bg-slate-800/50 backdrop-blur border border-slate-700/50`)
- Icon at top with colored circular background
- Title bold, subtitle small muted text
- Hover: slight scale `1.03`, glow border in accent color
- Selected: accent color border, checkmark badge
- Status indicators below tiles: "✅ Qualification model loaded" + "🔵 RAG Enabled"

---

## 4.3 Live Call Panel (Left Side)

### 4.3.1 Header Bar

```
● LIVE CALL  🔴     ▐▌  🔊  ⧫  ≡
```

- Green dot + "LIVE CALL" text + red recording indicator dot
- Right side: playback/pause button, volume, settings, menu
- Glassmorphism bar with dark transparent background

### 4.3.2 Audio Waveform Visualizer

```
┃▌│▐▌▌│▐│▌│▐│▌▐ ┃
```

- Horizontal audio waveform bars
- Animated during voice input (green/teal bars)
- Uses Web Audio API `AnalyserNode` for real-time frequency data
- Canvas or SVG rendering at 30fps
- Gradient: green → teal → blue

### 4.3.3 Chat Message Area

**Message Types:**

| Role            | Alignment     | Style                                                           |
| --------------- | ------------- | --------------------------------------------------------------- |
| **Agent**       | Left-aligned  | Dark blue bubble (`bg-blue-900/80`), white text, "Agent:" label |
| **Lead** (user) | Right-aligned | Lighter bubble (`bg-slate-600/60`), white text, "Lead:" label   |
| **System**      | Centered      | Muted text, no bubble                                           |

**MessageBubble Component:**

```typescript
interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
      extractedFields?: Record<string, string>;
      stateTransition?: string;
    };
  };
}
```

- **Agent bubbles**: Left-aligned, dark blue/navy background, rounded corners (more rounded on right), "Agent:" bold label prefix
- **Lead bubbles**: Right-aligned, slightly lighter background, rounded corners (more rounded on left), "Lead:" bold label prefix
- **Animation**: Fade-in + slide-up on appearance (300ms, ease-out)
- **Auto-scroll**: Chat scrolls to bottom on new message

### 4.3.4 Bottom Composer Bar

```
┌─────────────────────────────────────┐
│  🎧 Speak      🎤       ⌨️ Type    │
└─────────────────────────────────────┘
```

**Two primary action buttons:**

| Button    | Icon             | Color                  | Action                             |
| --------- | ---------------- | ---------------------- | ---------------------------------- |
| **Speak** | 🎧 Headset icon  | Green/teal pill button | Activates push-to-talk voice input |
| **Type**  | ⌨️ Keyboard icon | Blue pill button       | Shows text input field             |

**Central Microphone Button:**

- Large circular mic icon between the two buttons
- Pulsing animation when recording
- States: Idle (mic icon), Recording (pulsing red ring), Processing (spinner)

**When "Type" is active:**

- Text input field appears, replacing the Speak/Type buttons
- Send button (arrow icon) on the right
- Close/back button to return to Speak/Type mode
- Enter to send, Shift+Enter for newline

---

## 4.4 Dashboard Panel (Right Side)

### 4.4.1 Panel Grid Layout

```
┌──────────────────┬────────────────────┐
│   Lead Score     │   Lead Details     │
│   (gauge)        │   (field list)     │
├──────────────────┼────────────────────┤
│ Meeting          │   Recent Events    │
│ Scheduled        │   (timeline)       │
├──────────────────┴────────────────────┤
│         Follow-Up Schedule            │
└───────────────────────────────────────┘
```

### 4.4.2 Lead Score Gauge

```typescript
interface LeadScoreGaugeProps {
  score: number; // 0-100
  label: 'cold' | 'warm' | 'hot' | null;
  isModelLoaded: boolean;
}
```

**Design (matching reference):**

- **Semi-circular gauge** (half-donut arc, NOT full circle)
- Gradient arc: Red (left/Low) → Yellow/Orange (center/Warm) → Green (right/Hot)
- Large number in center: **"85"** in bold white text
- Labels: "Low" on left, "Warm" at top, "Hot" on right
- Below gauge: `✅ Qualification model loaded` checkmark text
- Title: **"Lead Score"** with subtitle icon

**Arc Colors:**

```css
/* Gauge gradient stops */
--gauge-low: hsl(0, 80%, 50%); /* Red */
--gauge-mid: hsl(38, 92%, 50%); /* Orange/Amber */
--gauge-warm: hsl(48, 96%, 53%); /* Yellow */
--gauge-hot: hsl(142, 71%, 45%); /* Green */
```

**Animation**: Smooth arc fill from 0 to final score over 800ms (spring easing)

### 4.4.3 Lead Details Panel

```typescript
interface LeadDetailsPanelProps {
  fields: {
    budget: string | null; // "$15,000"
    timeline: string | null; // "2-3 Months"
    need: string | null; // "New CRM System"
    decisionMaker: string | null; // "John (CTO)"
  };
}
```

**Design (matching reference):**

- Title: **"Lead Details"**
- Vertical list of key-value rows
- Each row: Label (muted) + Value (white, bold)
- Separator between label and value (subtle dotted line or spacing)
- Fields fill in one by one as extracted (shimmer → value animation)

| Field          | Label             | Example Value    |
| -------------- | ----------------- | ---------------- |
| Budget         | `Budget:`         | `$15,000`        |
| Timeline       | `Timeline:`       | `2-3 Months`     |
| Need           | `Need:`           | `New CRM System` |
| Decision Maker | `Decision Maker:` | `John (CTO)`     |

**States**:

- **Empty**: Show "—" or skeleton shimmer placeholder
- **Extracting**: Shimmer animation on the value area
- **Filled**: Green dot indicator + value text

### 4.4.4 Meeting Scheduled Panel

```typescript
interface MeetingPanelProps {
  meeting: {
    title: string; // "Demo Call with Sarah"
    dateTime: string; // "Tuesday, 2:00 PM"
    status: 'not_proposed' | 'proposed' | 'accepted' | 'declined';
  } | null;
}
```

**Design (matching reference):**

- Title: **"Meeting Scheduled"**
- Meeting title in bold white
- Date/time below in muted text
- Two action buttons: **[Reschedule]** (outline) and **[Cancel]** (outline/muted)
- When empty: "No meeting scheduled yet" placeholder

### 4.4.5 Recent Events Panel

```typescript
interface RecentEventsProps {
  events: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string; // "4:12 PM" format
  }>;
}
```

**Design (matching reference):**

- Title: **"Recent Events"**
- Vertical list with green checkmark `✅` icons on the left
- Each event: green check + description + time on the right
- Events ordered chronologically, newest at bottom
- Auto-scroll on new event

**Example events shown:**

```
✅  Industry selected: SaaS      4:12 PM
✅  Consent given                 4:13 PM
✅  Lead qualified                4:15 PM
```

**Event Icons by Type:**
| Event Type | Icon | Color |
|-----------|------|-------|
| `session_created` | ▶️ | Blue |
| `industry_selected` | ✅ | Green |
| `consent_given` | ✅ | Green |
| `field_extracted` | 📋 | Blue |
| `lead_qualified` | ✅ | Green |
| `score_computed` | 📊 | Purple |
| `ticket_created` | 🎫 | Amber |
| `meeting_proposed` | 📅 | Blue |
| `error` | ❌ | Red |

### 4.4.6 Follow-Up Schedule Panel

```typescript
interface FollowUpScheduleProps {
  followUps: Array<{
    day: number;
    label: string;
    description: string;
    status: 'scheduled' | 'sent' | 'opened' | 'cancelled';
  }>;
}
```

**Design (matching reference):**

- Title: **"Follow-Up Schedule"**
- Vertical list with timing labels
- Each row: **"In X Day(s):"** bold + description text
- Small calendar/clipboard icon on the right
- Strikethrough text for completed or cancelled items

**Items shown:**

```
📋  In 1 Day:  Send Friendly Reminder
📋  In 3 Days: Share Case Study
📋  In 7 Days: Final Check-In
```

---

## 4.5 State Management (Zustand)

### Store Architecture

```typescript
// stores/sessionStore.ts
interface SessionStore {
  sessionId: string | null;
  industry: IndustryType | null;
  currentState: WorkflowState;
  isConnected: boolean;
  isModelLoaded: boolean;
  isRAGEnabled: boolean;

  createSession: (industry: IndustryType) => Promise<string>;
  setCurrentState: (state: WorkflowState) => void;
  setConnected: (connected: boolean) => void;
}

// stores/chatStore.ts
interface ChatStore {
  messages: ChatMessage[];
  isAgentTyping: boolean;
  isVoiceRecording: boolean;
  inputMode: 'speak' | 'type'; // Speak/Type toggle

  addMessage: (message: ChatMessage) => void;
  setAgentTyping: (typing: boolean) => void;
  setVoiceRecording: (recording: boolean) => void;
  setInputMode: (mode: 'speak' | 'type') => void;
  sendMessage: (sessionId: string, text: string) => Promise<void>;
}

// stores/dashboardStore.ts
interface DashboardStore {
  leadScore: { score: number; label: string | null };
  leadFields: {
    budget: string | null;
    timeline: string | null;
    need: string | null;
    decisionMaker: string | null;
  };
  meeting: {
    title: string;
    dateTime: string;
    status: string;
  } | null;
  events: Array<{ id: string; type: string; description: string; timestamp: string }>;
  followUps: Array<{ day: number; label: string; description: string; status: string }>;

  updateLeadScore: (score: number, label: string) => void;
  updateLeadField: (field: string, value: string) => void;
  setMeeting: (meeting: MeetingState) => void;
  addEvent: (event: TimelineEvent) => void;
  addFollowUp: (followUp: FollowUp) => void;
}
```

### SSE Event Handler

```typescript
// lib/sse/useSSEConnection.ts
function useSSEConnection(sessionId: string) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/sessions/${sessionId}/events`);

    eventSource.addEventListener('message', (e) => {
      const event = JSON.parse(e.data);
      switch (event.type) {
        case 'agent_message':
          chatStore.addMessage(event.payload);
          chatStore.setAgentTyping(false);
          break;
        case 'state_transition':
          sessionStore.setCurrentState(event.payload.toState);
          dashboardStore.addEvent(event.payload);
          break;
        case 'field_extracted':
          dashboardStore.updateLeadField(event.payload.field, event.payload.value);
          dashboardStore.addEvent(event.payload);
          break;
        case 'score_updated':
          dashboardStore.updateLeadScore(event.payload.score, event.payload.label);
          break;
        case 'meeting_proposed':
          dashboardStore.setMeeting(event.payload);
          break;
        case 'followup_scheduled':
          dashboardStore.addFollowUp(event.payload);
          dashboardStore.addEvent(event.payload);
          break;
        case 'agent_typing':
          chatStore.setAgentTyping(true);
          break;
      }
    });

    return () => eventSource.close();
  }, [sessionId]);
}
```

---

## 4.6 Design System

### 4.6.1 Color Palette (Dark Theme)

```css
/* ─── Background layers ────────────────────── */
--bg-base: hsl(222, 47%, 6%); /* #0B1120 Deep navy */
--bg-card: hsl(217, 33%, 12%); /* #161F30 Card background */
--bg-card-hover: hsl(217, 33%, 15%); /* Hover state */
--bg-elevated: hsl(217, 33%, 17%); /* Elevated elements */

/* ─── Glassmorphism ────────────────────────── */
--glass-bg: rgba(15, 23, 42, 0.6); /* Transparent overlay */
--glass-border: rgba(148, 163, 184, 0.1); /* Subtle border */
--glass-blur: 12px; /* Backdrop blur */

/* ─── Text ─────────────────────────────────── */
--text-primary: hsl(210, 40%, 98%); /* Near-white */
--text-secondary: hsl(215, 20%, 65%); /* Muted/subtitle */
--text-muted: hsl(217, 15%, 45%); /* Very muted */

/* ─── Accent colors ──────────────────────── */
--accent-blue: hsl(217, 91%, 60%); /* Primary actions */
--accent-green: hsl(142, 71%, 45%); /* Success, live indicator */
--accent-red: hsl(0, 72%, 50%); /* Recording, destructive */
--accent-amber: hsl(38, 92%, 50%); /* Warnings, warm score */
--accent-violet: hsl(263, 70%, 60%); /* Consulting, accent */

/* ─── Industry tile colors ────────────────── */
--industry-saas: #6366f1;
--industry-realestate: #10b981;
--industry-healthcare: #ef4444;
--industry-ecommerce: #f59e0b;
--industry-consulting: #8b5cf6;

/* ─── Score gauge gradient ─────────────────── */
--gauge-cold: hsl(0, 80%, 50%); /* Red → low */
--gauge-cool: hsl(25, 90%, 50%); /* Orange */
--gauge-warm: hsl(48, 96%, 53%); /* Yellow → warm */
--gauge-hot: hsl(142, 71%, 45%); /* Green → hot */

/* ─── Chat bubbles ─────────────────────────── */
--bubble-agent: hsl(217, 60%, 18%); /* Dark blue */
--bubble-user: hsl(215, 25%, 30%); /* Lighter gray-blue */
```

### 4.6.2 Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 4.6.3 Glassmorphism Card Style

```css
.glass-card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1rem;
}
```

### 4.6.4 Animation Specs

| Element                 | Animation                 | Duration         | Easing           |
| ----------------------- | ------------------------- | ---------------- | ---------------- |
| Message bubble          | Fade in + slide up (12px) | 300ms            | `ease-out`       |
| Lead score gauge arc    | Arc sweep from 0 to value | 800ms            | `spring(1, 0.5)` |
| Field extraction        | Shimmer → value fade-in   | 400ms            | `ease-out`       |
| Event timeline item     | Fade in + expand height   | 250ms            | `ease-out`       |
| Voice recording ring    | Pulsing ring scale        | 1000ms loop      | `ease-in-out`    |
| Audio waveform bars     | Height oscillation        | 60fps continuous | Linear           |
| Industry tile hover     | Scale(1.03) + glow border | 200ms            | `ease-out`       |
| Speak/Type button press | Scale(0.95)               | 100ms            | `ease-in`        |

---

## 4.7 Voice UI Specification

### 4.7.1 Speak/Type Toggle

The composer bottom bar has TWO modes:

**Speak Mode (default):**

- Large "Speak" button (green pill, headset icon)
- Central microphone button (large circle)
- "Type" button (blue pill, keyboard icon) — switches to Type Mode

**Type Mode:**

- Text input field with placeholder "Type your message..."
- Send button (arrow icon) on right
- Back button to return to Speak/Type mode

### 4.7.2 Push-to-Talk Flow

```
User clicks "Speak" or Mic button
    │
    ▼
┌─────────────────┐
│ Start recording  │
│ Audio waveform   │
│ animates         │
│ Mic pulses red   │
└─────┬───────────┘
      │ User clicks again (or releases)
      ▼
┌─────────────────┐
│ Stop recording   │
│ Send to STT      │
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│ Transcript shown │
│ in chat as user  │
│ message          │
│ Auto-submit to   │
│ message API      │
└─────────────────┘
```

### 4.7.3 Audio Waveform Visualization

Located below the LIVE CALL header:

- Horizontal bar visualization (like the reference image)
- Green/teal colored bars
- Responds to microphone input frequency data
- Uses `Web Audio API` → `AnalyserNode` → `getByteFrequencyData()`
- Rendered via Canvas element at 30fps
- When not recording: static low bars or flat line

---

## 4.8 Responsive Design

### Desktop (> 1024px) — Primary Layout

- Industry selector: full horizontal row of 5 tiles
- Session: side-by-side (Chat 40% | Dashboard 60%)
- All dashboard panels visible

### Tablet (768px–1024px)

- Industry selector: 5 tiles, slightly compressed
- Session: side-by-side (Chat 45% | Dashboard 55%)
- Dashboard: single-column, stacked panels

### Mobile (< 768px)

- Industry selector: horizontal scroll or 2×3 grid
- Session: tabbed view (Chat tab | Dashboard tab)
- Chat takes full width
- Dashboard panels stacked vertically
- Voice button is prominent (larger)
- Composer bar sticks to bottom (fixed position)

---

## 4.9 Component File Structure

```
src/components/
├── ui/                          # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── input.tsx
│   ├── separator.tsx
│   └── tooltip.tsx
│
├── landing/
│   ├── IndustrySelector.tsx     # Full industry bar container
│   ├── IndustryTile.tsx         # Single industry card
│   └── StatusIndicators.tsx     # "Model loaded" + "RAG Enabled"
│
├── chat/
│   ├── LiveCallPanel.tsx        # Full left panel container
│   ├── CallHeader.tsx           # "LIVE CALL" header bar
│   ├── AudioWaveform.tsx        # Waveform visualization
│   ├── MessageList.tsx          # Scrollable message area
│   ├── MessageBubble.tsx        # Single message (Agent/Lead)
│   ├── ComposerBar.tsx          # Speak/Type bottom bar
│   ├── VoiceButton.tsx          # Push-to-talk mic button
│   ├── SpeakTypeToggle.tsx      # Speak/Type pill buttons
│   └── TypingIndicator.tsx      # Agent typing dots
│
└── dashboard/
    ├── DashboardPanel.tsx       # Full right panel container
    ├── LeadScoreGauge.tsx       # Semi-circular score gauge
    ├── LeadDetailsPanel.tsx     # Budget, Timeline, Need, DM
    ├── MeetingPanel.tsx         # Meeting scheduled card
    ├── RecentEvents.tsx         # Event timeline (checkmarks)
    └── FollowUpSchedule.tsx     # Day 1/3/7 schedule
```

---

## 4.10 Accessibility (a11y)

| Requirement         | Implementation                                          |
| ------------------- | ------------------------------------------------------- |
| Keyboard navigation | Tab through tiles, chat input, buttons                  |
| Screen reader       | ARIA labels on gauge value, event items, button states  |
| Color contrast      | WCAG AA — all text meets 4.5:1 ratio                    |
| Focus indicators    | Visible focus rings (blue outline)                      |
| Voice alternative   | Text input always available alongside voice             |
| Motion sensitivity  | `prefers-reduced-motion` disables waveform, gauge sweep |
| Semantic HTML       | `<main>`, `<aside>`, `<nav>`, proper heading hierarchy  |

---

## 4.11 Error & Empty States

| Scenario            | UI Behavior                                       |
| ------------------- | ------------------------------------------------- |
| SSE disconnected    | Yellow banner: "Reconnecting…" with spinner       |
| Message send failed | Red outline on message, small "Retry" link        |
| Voice not supported | "Speak" button hidden, text-only mode             |
| Session not found   | Redirect to `/` with toast error                  |
| No events yet       | "Waiting for events…" placeholder in timeline     |
| No meeting yet      | "No meeting scheduled" muted text                 |
| No follow-ups yet   | "Follow-ups will appear after scoring" muted text |
| No score yet        | Gauge shows "—" instead of number, gray arc       |

---

## 4.12 Session Recovery (Page Refresh)

When a user refreshes the page during an active session, the app must restore state:

### Recovery Flow

```
Page loads with session ID in URL
    │
    ▼
GET /api/sessions/[id]
    │ Returns: currentState, messages, leadFields, score, events, followUps
    ▼
Hydrate all Zustand stores from response:
    • sessionStore ← currentState, industry
    • chatStore ← messages (full history)
    • dashboardStore ← leadFields, score, events, followUps, meeting
    │
    ▼
Open SSE connection with Last-Event-ID
    │ If reconnecting: server replays all events after the given ID
    │ If fresh: starts from current point
    ▼
UI renders fully populated state
```

### Implementation

```typescript
// In session/[id]/page.tsx
useEffect(() => {
  async function loadSession() {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const session = await res.json();

    // Hydrate stores
    sessionStore.hydrate(session);
    chatStore.hydrate(session.messages);
    dashboardStore.hydrate({
      leadFields: session.leadFields,
      score: session.score,
      scoreLabel: session.scoreLabel,
      events: session.events,
      followUps: session.followUpJobs,
      meeting: session.meeting,
    });
  }

  loadSession();
}, [sessionId]);
```

### API Response for Recovery

`GET /api/sessions/[id]` returns the full session state including:

- All messages (ordered by `createdAt`)
- All events (ordered by `createdAt`)
- Current `leadFields` JSONB
- Score + label + reasons
- Follow-up jobs and their statuses
- Meeting status (if any)

---

## 4.13 Analytics Page (`/analytics`)

**Layout:**

```
┌────────────────────────────────────────────────────────┐
│  ANALYTICS DASHBOARD                                   │
│                                                        │
│  ┌─────────────────────────────────────────────┐       │
│  │  Conversion Funnel (bar chart)              │       │
│  │  Started → Consented → Qualified → Meeting  │       │
│  │  100%      85%         62%          34%     │       │
│  └─────────────────────────────────────────────┘       │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────────┐       │
│  │ Outcome Distrib. │  │ Drop-off Heatmap     │       │
│  │ 🟢 Hot:  34%     │  │ Q1: 5%  Q2: 8%      │       │
│  │ 🟡 Warm: 28%     │  │ Q3: 12% Q4: 3%      │       │
│  │ 🔵 Cold: 38%     │  │ Q5: 2%              │       │
│  └──────────────────┘  └──────────────────────┘       │
│                                                        │
│  ┌─────────────────────────────────────────────┐       │
│  │  Recent Sessions Table                      │       │
│  │  ID | Industry | Score | Status | Duration  │       │
│  └─────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────┘
```

Uses `recharts` for the bar chart (funnel), donut chart (outcomes), and heat grid (drop-off).
