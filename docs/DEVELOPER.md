# Novent — Developer Documentation

## Architecture Overview

```
Client (Browser)          API (Next.js)               Firebase
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│   React Pages    │ ──>  │  API Routes       │ ──> │  Firestore   │
│   React Flow     │      │  Middleware        │      │  Admin SDK   │
│   Auth (Client)  │      │  Auth Context      │      │  Auth Admin  │
└─────────────────┘      └──────────────────┘      └──────────────┘
         │                        │
         │                   ┌────┴────┐
         │                   │ Logger  │
         │                   │ AppError│
         │                   └─────────┘
```

### Directory Structure

```
app/                          # Next.js App Router
  (protected)/                # Authenticated pages
  api/                        # API Routes
    _lib/auth.ts              # Auth context (getAuthContext)
    workflows/                # Workflow CRUD API
    events/emit/              # Event emission
    jobs/                     # Job management
    webhooks/whatsapp/        # WhatsApp webhook
    automations/              # Legacy v1 automations
    cron/                     # Cron job processor

src/
  automation/                 # Automation Engine v2
    types/                    # TypeScript interfaces
    registry/                 # ActionRegistry, TriggerRegistry, etc.
    engine/                   # Core engine (workflow-engine, context-builder, etc.)
    validators/               # Workflow, node, edge validators
    executors/                # Node executors (trigger, condition, action, etc.)
    actions/                  # Action implementations (WhatsApp, Email, etc.)
    triggers/                 # Trigger matchers
    conditions/               # Condition evaluators
    providers/                # External integrations (WhatsApp)
    services/                 # WorkflowService, ExecutionService, SchedulerService
    __tests__/                # Unit tests
  components/
    workflow-editor/          # Visual workflow builder (React Flow)
  lib/
    logger.ts                 # Centralized logger
    app-error.ts              # Standardized error handling

lib/                          # Legacy libraries
  automations/                # v1 automation engine
  firebase.ts                 # Client Firebase SDK
  firebase-admin.ts           # Firebase Admin SDK
  types.ts                    # Shared types

components/ui/                # shadcn UI components
```

---

## Environment Variables

### Required — Public (Client-side)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain (project.firebaseapp.com) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID |

### Required — Server-side

| Variable | Description |
|---|---|
| `FIREBASE_ADMIN_KEY` | Service account JSON (stringified) |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token |
| `CRON_SECRET` | Secret for cron endpoint auth |

### Optional — Server-side

| Variable | Default | Description |
|---|---|---|
| `WHATSAPP_API_VERSION` | `v21.0` | Meta Graph API version |
| `WHATSAPP_WEBHOOK_SECRET` | — | WhatsApp webhook secret |
| `LOG_LEVEL` | `info` | Logging level (debug/info/warn/error) |

### Validation

Variables are validated at import time in:
- `lib/firebase.ts`: All 6 `NEXT_PUBLIC_FIREBASE_*` variables
- Missing critical variables throw with clear message at startup

---

## Logger

Centralized at `src/lib/logger.ts`.

```typescript
import { logger } from "@/src/lib/logger"

logger.info("Workflow started", { workflowId: "wf1", companyId: "comp1" })
logger.error("Execution failed", { executionId: "ex1" }, error)
logger.warn("Rate limit approaching", { companyId: "comp1" })
logger.debug("Processing node", { nodeId: "n1" })
```

### Features
- Levels: debug, info, warn, error
- Context fields: companyId, userId, executionId, workflowId
- Auto-sanitizes tokens, secrets, passwords from logs
- Respects `LOG_LEVEL` env var
- Debug logs suppressed in production
- Output format: JSON lines

---

## Error Handling

Standardized at `src/lib/app-error.ts`.

```typescript
import { AppError, handleApiError } from "@/src/lib/app-error"

// Throw in services
throw AppError.notFound("Workflow", "wf1")
throw AppError.validation("Name required", { field: "name" })
throw AppError.unauthorized()

// Factory methods
AppError.notFound(entity, id?)
AppError.validation(message, details?)
AppError.unauthorized(message?)
AppError.forbidden(message?)
AppError.internal(message, cause?)

// In API routes
try {
  // ...
} catch (error) {
  return handleApiError(error)
}
```

### Error Payload Structure

```json
{
  "code": "NOT_FOUND",
  "message": "Workflow no encontrado: wf1",
  "retryable": false,
  "details": null,
  "timestamp": "2026-07-05T20:00:00.000Z"
}
```

### Error Codes

UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, WORKFLOW_INVALID, EXECUTION_FAILED, ACTION_FAILED, WHATSAPP_ERROR, RATE_LIMITED, INTERNAL_ERROR, etc.

---

## Automation Engine v2

### Adding a New Action

1. Create file at `src/automation/actions/<name>.action.ts`
2. Implement `ActionExecutor` interface
3. Register via `actionRegistry.register(action)`

```typescript
import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"

const myAction: ActionExecutor = {
  type: "action.my.custom",
  label: "My Custom Action",
  description: "Description",
  configSchema: {},

  async execute(config, context, deps) {
    // config: Record<string, unknown> from user
    // context: ExecutionContext with eventPayload, variables
    return {
      success: true,
      output: { result: "done" },
      error: null,
      retryable: false,
    }
  },
}

actionRegistry.register(myAction)
```

4. Add node executor for the action type in NodeRegistry (or it uses `action.*` prefix)
5. Import in `src/automation/index.ts` for auto-registration

### Adding a New Trigger

1. Create file at `src/automation/triggers/<name>.trigger.ts`
2. Implement `TriggerMatcher` interface
3. Register via `triggerRegistry.register(matcher)`

```typescript
import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const myTrigger: TriggerMatcher = {
  type: "my.custom.event",
  label: "My Custom Event",
  description: "Triggers on custom event",
  match(event) { return event.type === "my.custom.event" },
  extractContext(event) { return { eventPayload: event.data } },
}

triggerRegistry.register(myTrigger)
```

### Adding a New Provider

1. Create directory at `src/automation/providers/<name>/`
2. Export types, client, config, errors
3. Consume from actions via the provider's API

---

## Workflow Builder

Located at `src/components/workflow-editor/`.

### Architecture

```
EditorLayout
├── Toolbar        — Name, save, publish, unpublish, validate
├── Sidebar        — Draggable node palette
├── Canvas         — React Flow with zoom, pan, drag-drop
└── Inspector      — Selected node properties + variable hints
```

### Data Flow

1. Sidebar drag → Canvas.onDrop → useWorkflowEditor.addNode(type, pos)
2. Connect nodes → useWorkflowEditor.onConnect → adds edge with branch metadata
3. Click node → Inspector shows config form
4. Save → validate() → workflowApi.update/create → PUT/POST /api/workflows
5. Publish → validate() → workflowApi.publish → creates versioned snapshot

### Type Conversion

```
EditorNode  ←→  WorkflowNode  (engineNodeToEditorNode / editorNodeToEngineNode)
EditorEdge  ←→  WorkflowEdge  (engineEdgeToEditorEdge / editorEdgeToEngineEdge)
```

---

## WhatsApp Integration

### Provider Architecture

```
src/automation/providers/whatsapp/
├── client.ts      — HTTP client to Meta Graph API
├── config.ts      — Resolves WhatsApp credentials per company
├── sender.ts      — High-level send functions (text, template)
├── normalizer.ts  — Normalizes incoming webhook payloads
├── webhook.ts     — Incoming message handler
├── verifier.ts    — Webhook verification
├── types.ts       — WhatsApp-specific types
├── errors.ts      — Error classification (retryable detection)
└── index.ts       — Barrel exports
```

### Webhook Flow

1. Meta sends POST to `/api/webhooks/whatsapp`
2. GET request verifies hub.challenge during setup
3. POST receives message notification
4. Resolves companyId from phoneNumberId
5. Normalizes incoming payload
6. Creates event + evaluates automations
7. Calls engine workflow runner

---

## Deployment

### Prerequisites

1. Firebase project with Firestore, Authentication
2. Meta WhatsApp Business Account (optional for beta)
3. Vercel project linked to GitHub

### Steps

1. Configure environment variables in Vercel
2. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
3. Deploy Firestore rules: `firebase deploy --only firestore:rules`
4. Configure cron job: Vercel Cron → `/api/cron/process-jobs`
5. Configure WhatsApp webhook → `/api/webhooks/whatsapp`
6. Build: `npm run build`
7. Deploy: Vercel auto-deploy from main branch

### Firestore Indexes

Already configured in `firestore.indexes.json`:

- `jobs`: companyId+status+priority+scheduledAt, companyId+type+status, status+scheduledAt
- `customers`: companyId+status+totalSpent, companyId+tags, companyId+phone
- `sales`: companyId+customerId+createdAt, companyId+status+createdAt
- `events`: companyId+type+timestamp
- `workflows`: companyId+enabled+publishedAt, companyId+updatedAt
- `executions`: companyId+workflowId+triggeredAt, companyId+status+triggeredAt
- `campaigns`: companyId+status+scheduledFor
- Legacy: clientes, ventas, automations, leads, messages, rateLimits, deadLetterQueue

### Production Checklist

- [ ] All 6 NEXT_PUBLIC_FIREBASE_* variables set
- [ ] FIREBASE_ADMIN_KEY set (service account)
- [ ] WHATSAPP_VERIFY_TOKEN set
- [ ] CRON_SECRET set
- [ ] Firestore indexes deployed
- [ ] Firestore rules deployed
- [ ] WhatsApp webhook configured
- [ ] Cron job configured (every 1min)
- [ ] npm run build passes
- [ ] npm test passes
- [ ] Multi-tenant isolation verified (user A cannot access company B data)
- [ ] Admin SDK only used in API routes (never in client components)

---

## Versioning

- Draft workflow edited at `companies/{companyId}/workflows/{id}`
- Publishing creates snapshot at `companies/{companyId}/workflows/{id}/versions/{version}`
- Version is auto-incremented on each publish
- Published workflows are immutable snapshots
- Execution always uses the published version snapshot

---

## Testing

Run: `npm test` (vitest)

### Test Structure

```
lib/automations/__tests__/     # Legacy v1 tests (34 tests)
src/automation/__tests__/      # v2 engine unit tests (85 tests)
```

### Test Coverage

| Module | Tests | Status |
|---|---|---|
| Variable Resolver | 12 | ✅ |
| Workflow Validator | 11 | ✅ |
| Node Validator | 9 | ✅ |
| Edge Validator | 8 | ✅ |
| Condition Evaluator | 18 | ✅ |
| Context Builder | 6 | ✅ |
| Event Bus | 5 | ✅ |
| Logger | 7 | ✅ |
| AppError | 9 | ✅ |
| Legacy Conditions | 16 | ✅ |
| Legacy Engine | 7 | ✅ |
| Legacy Actions | 11 | ✅ |

**Total: 119 tests, all passing**
