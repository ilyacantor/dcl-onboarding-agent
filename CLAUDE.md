# DCL Onboarding Agent

## What This Is

A conversational AI agent that interviews enterprise stakeholders, learns how their business is organized, and produces a structured **Enterprise Contour Map** that feeds the DCL semantic graph and configures NLQ.

It is part of the AutonomOS (AOS) platform — an AI-native enterprise operating system. This agent sits between AAM (which discovers system connections) and DCL (which provides the semantic layer). It captures the **human knowledge** that no system scan can discover: how the business is actually organized, which system is authoritative for what, and how the C-suite wants to see their data.

## What This Is NOT

- **Not NLQ.** NLQ answers questions against a built graph. This agent *builds* the graph.
- **Not a data catalog.** It captures organizational structure and business context, not field-level metadata.
- **Not a one-time tool.** After onboarding, it reactivates for drift resolution when structural changes are detected.

## Tech Stack

- **Runtime:** Node.js 20+, TypeScript 5+
- **Server:** Express 4
- **Database:** Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Real-time:** ws (WebSocket)
- **LLM:** @anthropic-ai/sdk (Claude Sonnet 4.5)
- **File parsing:** xlsx (SheetJS), pdf-parse, Claude vision for images
- **Frontend:** React 18 + Tailwind CSS + Vite
- **Email:** nodemailer or @sendgrid/mail (Sprint 3)
- **Scraping:** cheerio (Sprint 3)

## Repo Structure

```
dcl-onboard-agent/
  package.json
  tsconfig.json
  .env.example
  CLAUDE.md                          # This file
  prisma/
    schema.prisma
  docs/
    DCL_Onboarding_Agent_Spec_v01.docx
    DCL_Onboarding_Agent_Build_Blueprint.docx
  scripts/
    test-interview.ts               # Sprint 1 test script
  src/
    server/
      index.ts                      # Express server entry
      routes.ts                     # API route definitions
      controllers/
        session.controller.ts       # Create/resume/list sessions
        message.controller.ts       # Handle messages + file uploads
        contour.controller.ts       # Export/review contour map
        intel.controller.ts         # Pre-meeting intelligence
      services/
        llm.service.ts              # Anthropic SDK interface
        context.service.ts          # Loads AOD/AAM/DCL context
        state.service.ts            # Conversation state machine
        contour.service.ts          # Builds/updates contour map
        file.service.ts             # File processing router
        intel.service.ts            # Pre-meeting universe scan (Sprint 3)
        premeet.service.ts          # Pre-meeting request gen (Sprint 3)
      parsers/
        excel.parser.ts             # xlsx/csv (Sprint 2)
        pdf.parser.ts               # PDF extraction (Sprint 2)
        image.parser.ts             # Vision/OCR (Sprint 2)
      prompts/
        system.prompt.ts            # Master system prompt
        section-1.prompt.ts         # Business overview
        section-2.prompt.ts         # System authority
        section-3.prompt.ts         # Dimensional walkthrough
        section-4.prompt.ts         # Management reporting
        section-5.prompt.ts         # Pain points
        intel.prompt.ts             # Pre-meeting analysis (Sprint 3)
        premeet.prompt.ts           # Pre-meeting request (Sprint 3)
      types/
        session.types.ts
        contour.types.ts
        message.types.ts
        intel.types.ts
      db/
        prisma client setup
    client/
      App.tsx
      index.tsx
      components/
        ChatWindow.tsx              # Main conversation UI
        MessageBubble.tsx           # Text messages
        FileDropZone.tsx            # Drag-drop + '+' button
        InlineTable.tsx             # Tables in conversation
        InlineHierarchy.tsx         # Tree views in conversation
        ComparisonView.tsx          # Side-by-side system comparisons
        ConfirmWidget.tsx           # Correct / Not Quite / Skip
        ProgressTracker.tsx         # Section completion sidebar
        PreMeetPortal.tsx           # Pre-meeting upload page (Sprint 3)
      hooks/
        useSession.ts
        useFileUpload.ts
        useWebSocket.ts
```

## Data Model

### Session
```typescript
interface Session {
  id: string;                    // uuid
  customer_id: string;
  customer_name: string;
  stakeholder_name: string;
  stakeholder_role: string;
  status: 'INTEL_GATHERING' | 'PREMEET_SENT' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETE';
  current_section: '0A' | '0B' | '1' | '2' | '3' | '4' | '5';
  section_status: Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'PARKED'>;
  intel_brief: IntelBrief | null;
  premeet_artifacts_received: string[];
  contour_map: ContourMap;
  created_at: Date;
  updated_at: Date;
}
```

### Message
```typescript
interface Message {
  id: string;
  session_id: string;
  role: 'AGENT' | 'STAKEHOLDER' | 'SYSTEM';
  content: string;
  rich_content?: RichContent[];   // tables, hierarchies, comparisons
  files?: FileAttachment[];
  section: string;
  confidence_updates?: Record<string, number>;
  timestamp: Date;
}
```

### ContourMap
```typescript
interface ContourMap {
  organizational_hierarchy: HierarchyNode[];
  sor_authority_map: SOREntry[];
  conflict_register: Conflict[];
  management_overlay: HierarchyNode[];
  vocabulary_map: VocabularyEntry[];
  priority_queries: PriorityQuery[];
  follow_up_tasks: FollowUpTask[];
  raw_transcript: Message[];
  uploaded_artifacts: UploadedArtifact[];
  metadata: { version: string; created: Date; last_updated: Date; completeness_score: number; };
}
```

### HierarchyNode
```typescript
interface HierarchyNode {
  id: string;
  name: string;
  type: 'LEGAL_ENTITY' | 'DIVISION' | 'DEPARTMENT' | 'COST_CENTER' | 'PROFIT_CENTER' | 'REGION' | 'SEGMENT';
  level: number;
  parent_id: string | null;
  children: HierarchyNode[];
  source_system: string;
  source_field: string;
  confidence: number;
  provenance: 'PUBLIC_FILING' | 'SYSTEM_EXTRACTED' | 'STAKEHOLDER_CONFIRMED' | 'STAKEHOLDER_FILE' | 'INFERRED' | 'UNVERIFIED';
  notes: string;
}
```

## Conversation State Machine

```
0A (Universe Scan) → 0B (Pre-Meeting Request) → 1 (Business Overview) → 2 (System Authority) → 3 (Dimensional Walkthrough) → 4 (Management Reporting) → 5 (Pain Points) → COMPLETE
```

### State Transitions
```typescript
type Action =
  | { type: 'ADVANCE' }                     // Next section
  | { type: 'JUMP'; target: SectionId }      // Jump to section
  | { type: 'PARK' }                         // Park current section
  | { type: 'RESUME'; target: SectionId }    // Revisit parked
  | { type: 'PAUSE' }                        // End session, save
  | { type: 'COMPLETE' }                     // All done
```

The LLM does NOT manage state directly. It outputs tool calls. The state manager interprets them. State stays deterministic.

### Navigation Rules
- Forward: advance when exit condition met or stakeholder says "move on"
- Jump: stakeholder can jump by topic or file upload. Agent processes, tags, steers back.
- Park: stalled section → mark PARKED with open items → move forward
- Pause: stakeholder ends early → save state → resume from exact spot later

## LLM Architecture

### Model
Claude Sonnet (claude-sonnet-4-5-20250929). Fast for real-time chat. Smart for extraction. Cost-effective for long conversations.

### System Prompt (3 layers, composed dynamically)

**Layer 1 — Identity (static):**
You are the DCL Onboarding Agent. You learn how enterprises are organized. You ask ONE question at a time. You SHOW data and ask for confirmation rather than asking open-ended questions. You NEVER show concept IDs, field names, or confidence scores. You speak in business language. You respect the stakeholder's time.

**Layer 2 — Context (per session):**
Customer name, stakeholder name/role, intel brief, confirmed items so far, unresolved items, uploaded files and extracted data.

**Layer 3 — Section (per section):**
Goals, questions, behaviors, exit conditions for the current section.

### LLM Tools
```
update_contour    — add/modify contour map node. Params: dimension_type, node_data, confidence, provenance
show_comparison   — render side-by-side system values. Params: dimension, systems[], values[]
show_hierarchy    — render tree view. Params: root_node, depth
show_table        — render data table. Params: headers[], rows[]
park_item         — mark unresolved. Params: dimension, question, suggested_person
advance_section   — complete current section, move to next
process_file      — send file to parser, get structured results
lookup_system_data — query AOD/AAM/DCL APIs for specific data
```

## Interview Sections

### Section 1: Business Overview (10-15 min)
**Goal:** Top-level org structure in stakeholder's vocabulary.
**Opening:** "I already have context from our system scan. How is your company organized at the highest level?"
**Capture:** Division/BU names, structure type (geographic/functional/product/hybrid), recent changes, vocabulary.
**Exit:** Top-level structure confirmed.

### Section 2: System Authority (5-10 min)
**Goal:** Which system is authoritative for which data.
**Opening:** "We found [N] systems. For org structure and reporting, which are the source of truth?"
**Capture:** SOR per dimension, known conflicts, data flow direction.
**Exit:** SOR per dimension identified.

### Section 3: Dimensional Walkthrough (25-30 min)
**Goal:** Validate every org dimension using discovered data.
**Opening:** "I'll walk through what we found, dimension by dimension. Tell me if it's right, wrong, or outdated."
**Dimensions in order:** Legal Entity, Division/BU, Cost Center, Department, Geography, Profit Center, Segment (ASC 280), Customer Segment.
**Behavior:** Show side-by-side comparisons. Highlight matches (green) and conflicts (amber). Stakeholder clicks to resolve.
**Exit:** 80%+ dimensions resolved.

### Section 4: Management Reporting (10 min)
**Goal:** Capture how the C-suite sees the business (often differs from system structure).
**Opening:** "When your CFO presents to the board, what does the management P&L look like?"
**Capture:** Management hierarchy, key metrics, manual adjustments.
**Exit:** Board view captured.

### Section 5: Pain Points (10 min)
**Goal:** What to optimize first, what NLQ queries to validate.
**Opening:** "What reporting questions cause the most pain? What takes too long or breaks every quarter-end?"
**Capture:** Top 5-10 painful questions, current bottlenecks, the one report that matters most.
**Exit:** Priority queries listed.

## Key Design Constraints

1. **One question at a time.** Never a wall of text. Max 2 sentences before asking for input.
2. **Show, don't ask.** Present discovered data for confirmation. Don't ask stakeholders to recall from memory.
3. **Respect the clock.** 60-90 min total. Internal time budgets. Park and move on if stuck.
4. **Any input, any format.** Text, Excel, screenshot, PDF, image. Whatever's fastest for the stakeholder.
5. **Human checkpoint.** Contour map is reviewed by FDE before production graph. v1 does not auto-publish.
6. **The customer never sees the ontology.** No concept IDs. No field names. No confidence scores. Business language only.

## API Routes

```
POST   /api/sessions                    — Create session, trigger Phase 0A
GET    /api/sessions/:id                — Get session state
GET    /api/sessions/:id/intel          — Get intel brief
POST   /api/sessions/:id/premeet/send   — Send pre-meeting email
POST   /api/sessions/:id/premeet/upload — Pre-meeting file upload
WS     /ws/sessions/:id                 — Real-time conversation
POST   /api/sessions/:id/messages       — Send message (fallback)
GET    /api/sessions/:id/messages       — Get history (for resume)
GET    /api/sessions/:id/contour        — Export contour map
POST   /api/sessions/:id/contour/approve — FDE approval
GET    /api/sessions/:id/followups      — Follow-up task list
```

## Build Order

### Sprint 1: Backend Core
1. Project scaffold (package.json, tsconfig, Express entry)
2. Prisma schema + SQLite
3. Routes (stubs)
4. Conversation state machine
5. LLM service with Anthropic SDK
6. System prompt + 5 section prompts
7. Tool implementations (update_contour, park_item, advance_section)
8. Contour map builder service
9. Test script simulating a finance stakeholder interview
**Checkpoint:** Can conduct full interview via API. No frontend.

### Sprint 2: Multimodal + Frontend
1. File parsers (Excel, PDF, image)
2. File upload handling in message flow
3. React + Tailwind frontend shell
4. ChatWindow + WebSocket
5. Rich inline components (table, hierarchy, comparison, confirm)
6. FileDropZone ('+' and drag-drop)
7. ProgressTracker sidebar
**Checkpoint:** Full interview with file uploads in browser UI.

### Sprint 3: Pre-Meeting Intelligence
1. Intel service (web scraping for public data)
2. Intel prompt + LLM analysis
3. Pre-meeting request generator
4. Email delivery
5. Pre-meeting upload portal page
6. Pre-uploaded files in conversation context
**Checkpoint:** Create session for real company, get intel + prep email.

### Sprint 4: Live Integration
1. AOD API client
2. AAM API client
3. DCL API client
4. Replace sample context with live data
5. Contour map export to DCL
6. FDE review/approval UI
7. Deploy to Replit (Render later)
**Checkpoint:** End-to-end with real AOS data.

## Cross-Module Context (for reference only)

This agent interacts with other AOS modules:
- **AOD** (Asset & Oversight Discovery): provides the asset inventory (what systems exist)
- **AAM** (Application Architecture Manager): provides fabric topology (how systems connect)
- **DCL** (Data Connectivity Layer): consumes the contour map to build the semantic graph
- **NLQ** (Natural Language Query): queries the graph the contour map helped build
- **Farmv2**: simulation data for testing
- **AOA** (Agentic Orchestration Architecture): governance layer (future integration)

These modules are in separate repos. This agent calls their APIs but does not import their code.

## Companion Documents

For deeper detail, read:
- `docs/DCL_Onboarding_Agent_Spec_v01.docx` — full product spec
- `docs/DCL_Onboarding_Agent_Build_Blueprint.docx` — full engineering blueprint with data models, file processing pipeline, frontend architecture, and test strategy
