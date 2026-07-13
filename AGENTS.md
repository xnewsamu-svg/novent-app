<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- TODO: This file is managed by AGENTS.md. Do not modify manually. -->

## Goal
- Stabilize Engine v1 for production launch (Sprint 1.6).
- Then migrate Dashboard and implement Automation Engine v2.

## Constraints & Preferences
- Do not modify existing files unless explicitly specified.
- Do not break TypeScript, existing behavior, or introduce tech debt.
- Use registry pattern, no switch statements, no `any`, no unnecessary casts.
- All new code must follow the existing service+hook architecture.
- All registries must auto-register via imports, never via manual lists.
- Dashboard: eliminate onSnapshot, reuse existing services, split into presentational components.
- Automation Engine: graph-based workflow engine, SOLID, scalable, extensible.

## Progress
### Done (Pre-Sprint 1.6)
- [x] Completed full technical audit of current dashboard (map, onSnapshot inventory, dependencies, classification, migration phases, risks).
- [x] Refactored Dashboard: eliminated all onSnapshot, replaced with getDocs + polling.
  - [x] Created `src/hooks/usePolling.ts`
  - [x] Created `src/hooks/useDashboardData.ts` (orchestrator hook, no Firestore)
  - [x] Extracted presentational components: DashboardHeader, OnboardingCards, DashboardStats, DashboardCharts, RecentSalesFeed
  - [x] Refactored WhatsAppMetrics: removed internal auth, receives campaigns as prop
  - [x] Refactored TodaysLeads: onSnapshot → getDocs + usePolling(30s)
  - [x] Refactored DlqWidget: onSnapshot → getDocs + usePolling(60s)
  - [x] Rewrote page.tsx: uses useAuth + useDashboardData + presentational components
- [x] Built automation architecture document (14 sections: data model, nodes, edges, execution, versioning, registry, etc.)
- [x] Implemented automation engine foundation (31 files):
  - [x] Types: events, workflow, execution, trigger, action, condition
  - [x] Registries: ActionRegistry, TriggerRegistry, ConditionRegistry, NodeRegistry (Map-based, no switch)
  - [x] Conditions: comparison-evaluator (12 operators), logical-evaluator (AND/OR/NOT recursive), expression-parser
  - [x] 8 Actions placeholder with auto-registration
  - [x] 7 Triggers with auto-registration
  - [x] 5 Executors (trigger, condition, action, delay, end)
  - [x] Engine: workflow-engine, node-executor, condition-evaluator, context-builder
  - [x] Validators: workflow, node, edge (duplicate IDs, cycle detection, condition branch validation)
  - [x] Services skeleton: workflow, execution, scheduler
  - [x] `src/automation/index.ts` with all exports + auto-registration imports
- [x] Implemented runtime V1 for the engine:
  - [x] Phase 1: WorkflowService (Firestore CRUD, versioning, publish, findWorkflowsByEvent)
  - [x] Phase 2: ExecutionService (Firestore CRUD for executions + append-only logs)
  - [x] Phase 3: SchedulerService (uses existing createJob from `lib/automations/jobs.ts`, exponential backoff 1/2/4/8/16s)
  - [x] Phase 4: WorkflowEngine complete (run, resumeExecution, runExecution, retryExecution, executeLoop)
  - [x] Phase 5: VariableResolver (`{{dot.notation}}`, template resolution, null safety)
  - [x] Phase 6: AutomationEventBus (emit/subscribe/unsubscribe/subscribeAll)
  - [x] Phase 7: ContextBuilder (build, merge, resolve, setVariable, getOutputVariable)
  - [x] Phase 8: ConditionEvaluator enhanced (recursive with variable resolution)
  - [x] Phase 9: Registries (findMatchingWorkflows in TriggerRegistry)
  - [x] Phase 10: Validators complete (max nodes, depth, condition expression validation, actionType check)
  - [x] Phase 11: Execution Limits (MAX_NODE_VISITS=200, MAX_RETRIES=5, MAX_DURATION_MS=30min)
  - [x] Phase 12: DelayExecutor (non-blocking, saves current node, schedules resume, pauses execution)
  - [x] Phase 13: Placeholders complete (all 8 actions return valid ActionResult with retryable flags)
  - [x] Phase 14: Logging (each node logs pending→success/error, input, output, error, timestamp)
- [x] Build verified: `npm run build` successful, `tsc --noEmit` 0 errors.
- [x] 0 `any` types in automation/ directory.
- [x] 0 `onSnapshot` in dashboard/ directory.

### Done (Sprint 1.6 — Automation Stabilization)
- [x] **Bloqueante #1:** `emitEvent()` no disparaba `evaluateAutomationEvent()`. El flujo UI → evento → automation estaba roto para todas las operaciones desde clientes, ventas e inventario. Solo funcionaba WhatsApp webhook.
  - **Solución:** `lib/automations/events.ts:emitEvent()` ahora hace fetch a `POST /api/events/emit` en vez de escribir directamente con client SDK. La API route (que usa Admin SDK) almacena el evento Y llama a `evaluateAutomationEvent()`, que crea la ejecución y los jobs. 0 cambios en los 3 callers (clientes, ventas, inventario pages).

### Done (Sprint 1.6 — Final CTO Audit)
- [x] **Final CTO audit completed** — all subsystems verified post-stabilization.
  - ✅ Build: `npm run build` successful (Turbopack 10.8s, 24 routes, no errors)
  - ✅ Tests: 127/127 passed across 13 test files (including new pii-sanitizer tests)
  - ✅ TypeScript: `tsc --noEmit` 0 errors
  - ✅ Lint: 0 errors, 83 warnings (all unused-vars, cosmetic)
  - ✅ 0 `any` in `src/automation/`
  - ✅ 0 `onSnapshot` in dashboard
  - ✅ All CRITICAL findings from initial audit verified and fixed (proxy.ts, auth token refresh, cookie max-age, webhook HMAC, V1/V2 decoupling, condition variable resolution, error catches, ventas customerId bug)

### Done (Sprint 1.7 — ALTO Issues)
- [x] **Fix #1 — scheduleRetry order** (MEDIUM): `scheduler.service.ts:scheduleRetry()` ahora actualiza el status de la ejecución ANTES de crear el job. Si `createJob()` falla, la excepción propaga y el caller marca la ejecución como failed. 0 retries perdidos silenciosamente.
- [x] **Fix #2 — Optimistic locking** (HIGH): `execution.service.ts` ahora usa `adminDb.runTransaction()` en `update()`. Lee el `__version` actual dentro de la transacción, lo incrementa, y escribe. Dos writes concurrentes al mismo execution document ya no pueden sobrescribirse. `create()` inicializa `__version: 0`.
- [x] **Fix #3 — PII en execution logs** (CRITICAL): Creado `src/automation/engine/pii-sanitizer.ts` con `sanitizePII()`. Redacta campos conocidos de PII (`phone`, `email`, `name`, `to`, `waId`, `body`, etc.) recursivamente en objetos anidados. Aplicado a todos los `writeLog()` en `workflow-engine.ts` (input y output). 9 tests unitarios. Inmutabilidad garantizada.

### Done (Sprint 1.7 — Fixes)
- [x] **Placeholder actions implemented**: email (`action.email.send`) now uses Resend real API, webhook (`action.webhook.call`) makes real HTTP fetch, event-emit (`action.event.emit`) calls `/api/events/emit`. 0 placeholders remaining.
- [x] **V2 workflow list visible**: `automatizaciones/page.tsx` now fetches both V1 automations (Firestore) and V2 workflows (`/api/workflows`) with tab switcher. Includes link to executions history.
- [x] **WhatsApp provider V2 tests**: Created `whatsapp-provider.test.ts` with 33 tests covering errors, retryable detection, classifyMetaError, classifyNetworkError, verifySignature, and sender.
- [x] **Campaign sending**: Created `campaign.service.ts` + `/api/campaigns/process` that reads scheduled campaigns, filters customers by audience, sends via WhatsApp V2 provider, and updates status. Integrated into cron.
- [x] **Execution history UI**: Created `/automatizaciones/executions` page showing V2 executions with status filters (pending/running/paused/completed/failed).
- [x] **Scheduled.time events**: Created `scheduler-cron.service.ts` with cron expression evaluator (`* * * * *` format) that fires `scheduled.time` events for matching workflows. Integrated into cron.
- [x] **Firestore indexes**: All required indexes already exist (workflows on enabled+publishedAt, executions on companyId+triggeredAt, campaigns on status+scheduledFor).

### Done (Sprint 1.7 — Execution API + Tests)
- [x] **API routes de executions** (5 rutas):
  - `GET /api/executions` — lista con filtro `?status=` opcional
  - `GET /api/executions/[id]` — detalle de ejecución
  - `POST /api/executions/[id]/retry` — reintenta ejecución fallida (resetea a pending + llama al engine)
  - `POST /api/executions/[id]/cancel` — cancela ejecución en pending/running/paused
  - `GET /api/executions/[id]/logs` — logs de una ejecución
- [x] **`execution.service.ts`**: agregado `getByCompanyAndStatus()` con query indexada
- [x] **Refactor `executions/page.tsx`**: eliminado `onSnapshot`/`getDocs` directo de Firestore → `fetch('/api/executions')`. Agregados botones de retry y cancel.
- [x] **Tests unitarios de servicios** (31 tests nuevos, 195 total):
  - `execution-service.test.ts` — 10 tests (create, getById, getByCompany, getByCompanyAndStatus, getByWorkflow, writeLog, getLogs)
  - `workflow-service.test.ts` — 13 tests (CRUD, publish, list, findWorkflowsByEvent, loadWorkflowVersion)
  - `scheduler-service.test.ts` — 8 tests (scheduleExecution, scheduleRetry con backoff, scheduleResume, cancel)
- [x] **Índice compuesto Firestore** para executions subcollection (`status ASC, triggeredAt DESC`)

### Done (Sprint 1.7 — Client SDK → API Routes Migration)
- [x] **API routes WhatsApp campaigns** (2 rutas):
  - `GET /api/whatsapp/campaigns` — lista campañas
  - `POST /api/whatsapp/campaigns` — crear campaña
  - `DELETE /api/whatsapp/campaigns/[id]` — eliminar campaña
- [x] **API routes WhatsApp templates** (3 rutas):
  - `GET /api/whatsapp/templates` — lista templates
  - `POST /api/whatsapp/templates` — crear template
  - `PUT /api/whatsapp/templates/[id]` — actualizar template
  - `DELETE /api/whatsapp/templates/[id]` — eliminar template
- [x] **API route signup** (1 ruta):
  - `POST /api/auth/signup` — crea company + user docs con Admin SDK
- [x] **3 páginas refactorizadas**: eliminan `collection(db, ...)` / `addDoc` / `updateDoc` / `deleteDoc` directo de Firestore, ahora usan `fetch()` a API routes:
  - `whatsapp/page.tsx` — dashboard WhatsApp
  - `whatsapp/campaigns/page.tsx` — gestión de campañas
  - `whatsapp/templates/page.tsx` — gestión de templates
  - `signup/page.tsx` — registro de empresa

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Dashboard uses getDocs + polling instead of onSnapshot because dashboard is read-only and doesn't need real-time updates.
- useDashboardData orchestrator hook imports only service methods (salesService.getAll, customersService.getAll, whatsappService.getCampaigns), never Firestore directly.
- WhatsAppMetrics receives campaigns as prop; internal auth and listener removed.
- Automation Engine uses graph-based workflow (nodes + edges) rather than sequential action lists, enabling conditional branching and delays.
- Registries use prefix matching for action types: "action.*" in NodeRegistry dispatches all action nodes to ActionRegistry.
- Versioning: main document is editable draft; publishing creates immutable snapshot in versions/{v} subcollection.
- Delay execution is non-blocking: saves currentNodeId, sets status=paused, schedules resume job, exits engine loop.
- Scheduler uses existing `lib/automations/jobs.ts` createJob function to persist jobs in Firestore.
- Exponential backoff for retries: 1s, 2s, 4s, 8s, 16s (configurable via BACKOFF_BASE_MS).
- All engine services scoped by companyId for multi-tenant isolation.
- `createJob` in `lib/automations/jobs.ts` uses `firebase-admin` and expects `Date`, not `Timestamp` from client SDK.
- Event emission: `emitEvent()` changed from client SDK Firestore write to `fetch('/api/events/emit')` so that the API route (Admin SDK) stores the event AND calls `evaluateAutomationEvent()`. This fixes the broken UI→automation flow without changing any caller.

## Next Steps
1. **Pre-beta fixes** (before inviting users): Deploy Firestore rules + indexes, set env vars in Vercel, configure cron + WhatsApp webhook
2. **Post-beta** (Sprint 1.8+): Connect real actions (WhatsApp, Email, Sale, Customer, Inventory), write integration tests (Firestore emulator), build visual workflow editor UI, add API routes for CRUD operations on workflows and executions

## Critical Context
- Existing job system at `companies/{companyId}/jobs` with createJob from `lib/automations/jobs.ts` handles persistence; processing happens via `app/api/jobs/process` which uses a switch on job type. New automation jobs (type: "automation.execute"|"resume"|"retry") need a separate processor in a future phase.
- Events API at `/api/events/emit` stores events at `companies/{companyId}/events`. The new engine's `run()` function should be called from the events API handler.
- `lib/types.ts` has AutomationEvent with Timestamp type; new types in `src/automation/types/` use native Date for portability, with conversion in services.
- Existing v1 automations at `lib/automations/` remain untouched; new v2 engine is in `src/automation/`.
- `lib/automations/jobs.ts` uses `firebase-admin/firestore` for write operations, not client SDK.

## Relevant Files
- **`src/automation/`**: New engine directory (31 files). All engine code lives here.
- **`src/automation/engine/workflow-engine.ts`**: Core engine loop with run, resumeExecution, retryExecution, executeLoop, findNextNode, completeExecution, failExecution.
- **`src/automation/engine/variable-resolver.ts`**: `{{dot.notation}}` resolver from ExecutionContext.
- **`src/automation/engine/event-bus.ts`**: In-memory publish/subscribe bus.
- **`src/automation/engine/context-builder.ts`**: Context construction, merge, resolve, setVariable.
- **`src/automation/engine/condition-evaluator.ts`**: Recursive condition evaluation with variable resolution.
- **`src/automation/validators/`**: workflow-validator, node-validator, edge-validator (validation + cycle detection).
- **`src/automation/registry/`**: ActionRegistry, TriggerRegistry, ConditionRegistry, NodeRegistry (Map-based, no switch).
- **`src/automation/executors/`**: 5 executors (trigger, condition, action.* prefix, delay, end).
- **`src/automation/actions/`**: 8 placeholder actions (whatsapp, email, webhook, customer-update, sale-create, inventory-update, event-emit, delay).
- **`src/automation/triggers/`**: 7 triggers (customer, sale, inventory, lead, birthday, scheduled, webhook).
- **`src/automation/services/`**: workflow.service.ts, execution.service.ts, scheduler.service.ts.
- **`src/automation/index.ts`**: All exports + auto-registration imports.
- **`src/hooks/useDashboardData.ts`**: Dashboard data orchestrator.
- **`src/hooks/usePolling.ts`**: Generic polling hook.
- **`lib/automations/jobs.ts`**: Existing job creation function (firebase-admin).
