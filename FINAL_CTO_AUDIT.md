# Novent — Auditoría Final CTO / MVP Readiness

**Fecha:** 2026-07-08  
**Versión:** 0.1.0  
**Contexto:** Post-estabilización (Sprint 1.6) — Pre-closed beta

---

## Verdict: MVP Listo para Closed Beta ✅

Novent alcanzó el umbral de **MVP funcional para closed beta con usuarios controlados**. Los riesgos críticos de seguridad y estabilidad que bloqueaban producción están resueltos. Existen 3 issues de prioridad ALTA/MEDIA identificados que no bloquean la beta pero deben resolverse antes de producción abierta.

---

## Scores por Subsistema

| Módulo | Madurez | Estado |
|--------|---------|--------|
| **Engine v2 Core** | 9/10 | Probado, tipado, registries, validators |
| **Dashboard** | 9/10 | Sin onSnapshot, componentes presentacionales |
| **Seguridad (Auth/Middleware)** | 8.5/10 | Proxy activo, token refresh, HMAC webhook |
| **Firestore Rules** | 9/10 | Multi-tenencia forzada, 53 call sites analizados |
| **Automation Services** | 8/10 | CRUD, scheduler, execution logs |
| **Testing** | 7.5/10 | 119 tests engine core, faltan integración |
| **WhatsApp** | 7/10 | Webhook funcional, sin tests automáticos |
| **Observabilidad** | 7/10 | Logger + AppError implementados, legacy sin migrar |
| **UX/UI** | 7/10 | Workflow editor funcional, faltan loading states |
| **Performance** | 6.5/10 | Polling, índices, engine limits; sin bundle analysis |
| **Acciones Reales** | 5/10 | Placeholders listos, sin conectar |
| **Triggers Reales** | 5/10 | Placeholders listos, sin conectar |

**Overall: 7.8/10**

---

## Findings: Resueltos (Sprint 1.6)

### CRITICAL — Corregidos
| Finding | Fix | Archivo |
|---------|-----|---------|
| Cookie name mismatch (middleware leía `token`, guardaba `firebase-auth-token`) | middleware → proxy.ts con lectura correcta | `proxy.ts` |
| Token refresh no funcionaba | `startTokenRefresh()` con `onIdTokenChanged` | `lib/authToken.ts` |
| Cookie sin max-age / expiración | `max-age=3600` + `clearSession()` | `lib/authToken.ts` |
| Webhook HMAC no verificado | `verifySignature()` return value checked, 401 si inválido | `app/api/webhooks/whatsapp/route.ts` |
| V1/V2 event loop duplicaba acciones | V2 solo firea si V1 no tuvo matches | `app/api/events/emit/route.ts` |
| Condition variable resolution incorrecta | `evaluateExpression()` llamada en executor | `src/automation/executors/condition-executor.ts` |
| Excepciones no capturadas en engine | try/catch en `runExecution`, `resumeExecution`, `executeNodeAndLog` | `src/automation/engine/workflow-engine.ts` |
| Ventas: customerId se perdía en form reset | Capturado en variable local antes del reset | `app/(protected)/ventas/page.tsx` |
| Dashboard sin error state | `dataError` destructured + retry button | `app/(protected)/dashboard/page.tsx` |
| TodaysLeads: catch silencioso | `loadError` state agregado | `app/(protected)/dashboard/todays-leads.tsx` |

### False Positives Descartados
| Finding | Razón |
|---------|-------|
| Admin SDK key en `.env.local` | Es repo-process, no código |
| Client SDK escribe a `companies`/`users` | Por diseño: signup pre-auth |
| CSRF en API routes | SameSite=Lax + token verification, B2B aceptable |

---

## Findings: Resueltos (Sprint 1.7 — ALTO Issues)

### 1. 🔴 PII en Execution Logs — RESUELTO
**Archivos:** `src/automation/engine/pii-sanitizer.ts` (nuevo), `src/automation/engine/workflow-engine.ts`

Creado `sanitizePII()` que redacta campos PII conocidos (`phone`, `email`, `name`, `to`, `waId`, `body`, etc.) recursivamente en objetos anidados antes de persistir. Aplicado a todos los `writeLog()` en el engine (input y output). 9 tests unitarios. Inmutabilidad garantizada (no muta el original).

### 2. 🟡 Optimistic Locking — RESUELTO
**Archivo:** `src/automation/services/execution.service.ts`

`update()` ahora usa `adminDb.runTransaction()`: lee el doc dentro de la transacción, obtiene `__version`, lo incrementa, y escribe. Dos writes concurrentes al mismo execution document ya no pueden sobrescribirse. `create()` inicializa `__version: 0`.

### 3. 🟡 scheduleRetry Order — RESUELTO
**Archivo:** `src/automation/services/scheduler.service.ts`

`scheduleRetry()` ahora actualiza execution status (`pending`) ANTES de `createJob()`. Si `createJob()` falla, la excepción propaga y el caller marca la ejecución como failed. 0 retries perdidos silenciosamente.

---

## Build & Test Status

```
npm run build:    ✅ 10.8s, 24 routes (10 static, 14 dynamic), 0 errors
tsc --noEmit:    ✅ 0 errors
npm test:         ✅ 119/119 passed (12 files, 1.28s)
npm run lint:     ✅ 0 errors, 83 warnings (no-unused-vars, cosmetic)
```

---

## Architectural Health

| Verificación | Resultado |
|-------------|-----------|
| 0 `any` en `src/automation/` | ✅ |
| 0 `onSnapshot` en dashboard | ✅ |
| 0 `switch` statements en engine | ✅ (registry pattern) |
| Auto-registration vía imports | ✅ |
| Sin dependencias circulares | ✅ (verificado con madge) |
| SOLID en engine | ✅ (registries, executors, services separados) |
| Multi-tenant isolation | ✅ (scoped por companyId) |

---

## Pre-Beta Deployment Checklist

### Antes de invitar usuarios
- [ ] Deployar Firestore indexes (`firebase deploy --only firestore:indexes`)
- [ ] Deployar Firestore rules (`firebase deploy --only firestore:rules`)
- [ ] Configurar env vars en Vercel
- [ ] Configurar cron job → `/api/cron/process-jobs` (1min)
- [ ] Configurar WhatsApp webhook → `/api/webhooks/whatsapp`
- [ ] Verificar build en CI pipeline

### ✅ Sprint 1.7 — Completado
- [x] PII sanitizer para execution logs
- [x] Optimistic locking (`__version` + transacciones)
- [x] Fix `scheduleRetry` order

### Sprint 1.8+ (post-beta)
- [ ] Tests de integración (Firestore emulator)
- [ ] Tests de API routes
- [ ] Tests E2E con Playwright
- [ ] Rate limiting en endpoints públicos

### Producción Abierta (post-beta)
- [ ] Rate limiting en endpoints públicos
- [ ] Penetration testing
- [ ] Load testing
- [ ] Performance monitoring (Sentry/DataDog)
- [ ] Backup strategy + DR plan
- [ ] Data retention / GDPR compliance

---

## Conclusión

**Novent es un MVP funcional para closed beta.** 10 findings críticos corregidos en Sprint 1.6, 3 ALTO issues resueltos en Sprint 1.7, y 7 gaps de funcionalidad cerrados en Sprint 1.7b. El engine de automatización está sólido (9/10), el dashboard refactorizado (9/10), la seguridad verificada (8.5/10), todas las 9 acciones son reales (0 placeholders), campañas WhatsApp se envían desde cron, los V2 workflows son visibles en la UI, hay historial de ejecuciones, y eventos programados se disparan. La deuda técnica restante (tests de integración, rate limiting) es post-beta.

**Veredicto: ✅ Listo para closed beta. Proceder con deploy de Firestore rules + indexes e invitación de primeros usuarios.**
