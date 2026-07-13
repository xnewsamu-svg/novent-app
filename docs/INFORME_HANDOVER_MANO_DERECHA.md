# Informe de Handover — Automatizaciones Novent

**Para:** Mano derecha técnica — desarrollador a cargo de implementar automatizaciones
**De:** Staff Engineer — Diseño de arquitectura
**Fecha:** 22 de junio de 2026
**Proyecto:** Novent — SaaS multiempresa (Next.js 16 + Firestore)

---

## Índice

1. [Estado actual del proyecto](#1-estado-actual-del-proyecto)
2. [Lo que ya está diseñado (no tocar)](#2-lo-que-ya-está-diseñado-no-tocar)
3. [Decisiones arquitectónicas ya tomadas](#3-decisiones-arquitectónicas-ya-tomadas)
4. [Roadmap de implementación](#4-roadmap-de-implementación)
5. [Sprint 1 — Fundación (días 1–5)](#5-sprint-1--fundación-días-1-5)
6. [Sprint 2 — Eventos + Jobs (días 6–12)](#6-sprint-2--eventos--jobs-días-6-12)
7. [Sprint 3 — Automatizaciones (días 13–20)](#7-sprint-3--automatizaciones-días-13-20)
8. [Sprint 4 — Workers + Producción (días 21–30)](#8-sprint-4--workers--producción-días-21-30)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)
10. [Contacto y recursos](#10-contacto-y-recursos)

---

## 1. Estado actual del proyecto

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.6 |
| UI | React 19.2.4 + Tailwind CSS v4 + shadcn/ui + Radix UI |
| Backend | Next.js API Routes (no hay Cloud Functions aún) |
| Base de datos | Cloud Firestore (proyecto: `novent-app`, región: `nam5`) |
| Autenticación | Firebase Auth + JWT cookies (middleware valida token localmente) |
| Charts | Recharts 3.8.1 |
| Notificaciones | Sonner 2.0.7 |

### Colecciones Firestore actuales (en producción)

```
/users/{uid}                          → Datos globales del usuario
/companies/{companyId}                → Datos de la empresa
/companies/{companyId}/clientes/{id}   → Clientes (modelo legacy)
/companies/{companyId}/ventas/{id}     → Ventas (modelo legacy)
/companies/{companyId}/inventario/{id} → Productos
/companies/{companyId}/users/{uid}     → Membresía de usuario en empresa
```

### Módulos existentes

| Módulo | Estado | Archivo |
|--------|--------|---------|
| Landing | ✅ Listo | `app/page.tsx` |
| Login | ✅ Listo | `app/login/page.tsx` |
| Signup | ✅ Listo | `app/signup/page.tsx` |
| Dashboard | ✅ Listo | `app/(protected)/dashboard/page.tsx` |
| Clientes (CRM v1) | ✅ Listo | `app/(protected)/clientes/page.tsx` + `[id]/page.tsx` |
| Ventas (POS) | ✅ Listo | `app/(protected)/ventas/page.tsx` |
| Inventario | ✅ Listo | `app/(protected)/inventario/page.tsx` |
| WhatsApp | 🟡 Placeholder | `app/(protected)/whatsapp/page.tsx` |
| Automatizaciones | ❌ No existe | — |
| API Routes | ❌ No existen | — |

### Modelo legacy de clientes (lo que existe hoy en Firestore)

```ts
// /companies/{id}/clientes/{id}
{
  nombre: string
  telefono: string
  estado: "Activo"
  ultimaVisita: string (date o "Sin visitas")
  visitas: number
  totalGastado: number
}
```

### Modelo legacy de ventas (lo que existe hoy en Firestore)

```ts
// /companies/{id}/ventas/{id}
{
  cliente: string (ID del cliente)
  servicio: string
  precio: number
  fecha: string (YYYY-MM-DD)
  hora?: string (HH:MM:SS)
  productoId: string
  cantidad: number
}
```

### Modelo legacy de inventario (lo que existe hoy en Firestore)

```ts
// /companies/{id}/inventario/{id}
{
  nombre: string
  categoria: string
  precio: number
  stock: number
  stockMinimo: number
}
```

### Ausencias críticas detectadas

1. **No hay API routes** — No existe `app/api/`. Todo es frontend directo a Firestore.
2. **No hay tipos compartidos** — Los tipos están inline en cada página. No hay `lib/types.ts` en uso por las páginas aún.
3. **No hay sistema de eventos** — No se emiten eventos cuando ocurren acciones (crear cliente, completar venta).
4. **No hay workers** — No hay jobs queue, no hay procesamiento asíncrono.
5. **Sin Cloud Functions** — No hay Firebase Functions configuradas.
6. **Sin webhooks** — No hay integración con APIs externas.
7. **Sin reglas de seguridad para nuevas colecciones** — `firestore.rules` solo cubre colecciones legacy.

---

## 2. Lo que ya está diseñado (no tocar)

### Archivos entregados

| Archivo | Contenido | Estado |
|---------|-----------|--------|
| `lib/types.ts` | Interfaces TypeScript completas (370 líneas) | ✅ Diseñado, compila limpio |
| `docs/ARQUITECTURA_AUTOMATIZACIONES.md` | Documento completo de arquitectura (792 líneas) | ✅ Diseñado |
| `firestore.indexes.json` | 10 índices compuestos para todas las colecciones nuevas | ✅ Diseñado |
| `firestore.rules` | Reglas de seguridad (requieren actualización) | 🟡 Pendiente |

### Interfaces disponibles en `lib/types.ts`

| Interface | Extiende | Propósito |
|-----------|----------|-----------|
| `BaseDocument` | — | `id`, `createdAt`, `updatedAt` |
| `CompanyDocument` | `BaseDocument` | Agrega `companyId` — para todo documento tenant-scoped |
| `Job` | `CompanyDocument` | Unidad de trabajo del motor de automatización |
| `JobError` | — | Error individual con intento, mensaje y timestamp |
| `Customer` | `CompanyDocument` | CRM v2 con segmentación, consentimiento, scoring |
| `CustomerConsent` | — | Consentimiento por canal (whatsapp, email, sms) |
| `Sale` | `CompanyDocument` | Ventas con items, impuestos, descuentos, pagos |
| `SaleItem` | — | Producto individual dentro de una venta |
| `AutomationEvent` | — | Evento del sistema (sin timestamps base) |
| `Automation` | `CompanyDocument` | Definición de automatización (trigger + acciones) |
| `AutomationCondition` | — | Condición para evaluar triggers |
| `AutomationAction` | — | Acción a ejecutar (whatsapp, email, tag, etc.) |
| `AutomationTrigger` | — | Trigger: evento o schedule con condiciones |
| `AutomationExecution` | `CompanyDocument` | Trazabilidad de ejecución de automatizaciones |
| `Product` | `CompanyDocument` | Producto de inventario v2 (con costo, sku, barcode) |
| `InventoryMovement` | — | Movimiento de inventario (entrada/salida/ajuste) |
| `CompanySettings` | — | Configuración de la empresa |
| `CompanyUser` | — | Usuario dentro de una empresa |

### Decisiones arquitectónicas ya tomadas (NO REDISEÑAR)

1. **`automationState` eliminado** de Customer y Sale. El estado de automatizaciones vive en `automationExecutions`.
2. **`events[]` eliminado de Sale**. Los eventos viven en la colección global `/events/`. Sin duplicación.
3. **`SaleEventType` y `SaleEvent` eliminados**. No se necesitan si no hay `events[]` en Sale.
4. **`CompanyDocument` separado de `BaseDocument`**. `companyId` no está en `BaseDocument`. Solo `CompanyDocument` lo tiene. Esto evita que documentos globales arrastren `companyId` incorrectamente.
5. **`companyId` se mantiene como campo en todos los documentos tenant-scoped** por seguridad (security rules), collection group queries y portabilidad de datos.
6. **Nueva colección `automationExecutions`** creada para trazabilidad completa.
7. **Los IDs de documentos en clientes/ventas legacy usan español** (`nombre`, `telefono`, `servicio`, `precio`). Los nuevos modelos usan inglés. La migración es incremental.

---

## 3. Decisiones arquitectónicas ya tomadas

### Sobre BaseDocument vs CompanyDocument

```
BaseDocument { id, createdAt, updatedAt }           ← Para documentos globales
     ↑
CompanyDocument extends BaseDocument { companyId }  ← Para documentos bajo /companies/{id}/
```

**¿Por qué?** Porque `/users/{uid}` y otros documentos globales NO tienen `companyId`. Forzar `companyId` en `BaseDocument` contaminaría entidades globales. La herencia separada hace explícito qué pertenece a una compañía.

### Sobre la colección Events

```
/companies/{companyId}/events/{eventId}
```

Todos los eventos del sistema se escriben aquí. NO se duplican dentro de Customer, Sale ni ningún otro documento. `correlationId` permite agrupar eventos relacionados (ej: `sale.created` → `sale.completed` como una secuencia).

### Sobre Jobs

```
/companies/{companyId}/jobs/{jobId}

Estados: pending → running → completed / failed / cancelled
Reintentos: exponential backoff (1s, 2s, 4s... hasta 1h)
```

Los jobs NO se procesan con Cloud Functions (no existen aún). Se procesan con API Routes de Next.js + un cron job que ejecuta `GET /api/jobs/process` cada 30–60 segundos.

### Sobre la ejecución de automatizaciones

```
Evento → Match trigger → Evaluar condiciones → Crear AutomationExecution
                                                      ↓
                                               Crear uno o más Jobs
                                                      ↓
                                               Worker ejecuta cada Job
                                                      ↓
                                               AutomationExecution se marca completed/failed
```

Cada ejecución queda registrada en `automationExecutions` con `automationId`, `customerId`, `saleId` y los `jobIds` generados.

---

## 4. Roadmap de implementación

```
Sprint 1 (días 1-5)     Sprint 2 (días 6-12)     Sprint 3 (días 13-20)    Sprint 4 (días 21-30)
─────────────────────   ─────────────────────    ──────────────────────   ───────────────────────
                       
Foundation              Events + Jobs             Automations              Workers + Prod

- Migrar tipos          - Emitir eventos           - UI de automatizaciones  - Worker de WhatsApp
- Crear API routes      - Jobs queue               - Trigger matching        - Worker de Email
- Firestore rules       - Job processor            - Action execution        - Rate limiting
- Helpers comunes       - Reintentos               - AutomationExecutions    - TTL / limpieza
- Migrar Customer v1    - Tests de jobs            - Tests de flujo          - Monitoreo
```

---

## 5. Sprint 1 — Fundación (días 1–5)

### Tarea 1.1: Publicar `lib/types.ts` y migrar imports

**Qué hacer:**
- El archivo `lib/types.ts` ya existe con todas las interfaces.
- Las páginas actuales (`clientes/page.tsx`, `ventas/page.tsx`, `dashboard/page.tsx`, etc.) tienen tipos inline (ej: `type Cliente = {...}`).
- **NO** rompas las páginas existentes. Crea un alias o dualidad temporal:

```ts
// En lib/types.ts ya existe Customer (modelo v2 en inglés)
// Pero las páginas usan el modelo legacy con nombres en español

// Solución: crear adaptador en lib/adapters.ts
export function customerToLegacy(c: Customer) {
  return {
    nombre: c.name,
    telefono: c.phone,
    estado: c.status === "active" ? "Activo" : "Inactivo",
    ultimaVisita: c.lastPurchaseAt?.toDate().toISOString().split("T")[0] ?? "Sin visitas",
    visitas: c.visitCount,
    totalGastado: c.totalSpent,
  }
}

export function legacyToCustomer(data: any): Customer {
  return {
    id: data.id,
    name: data.nombre,
    phone: data.telefono,
    status: data.estado === "Activo" ? "active" : "inactive",
    visitCount: data.visitas ?? 0,
    totalSpent: data.totalGastado ?? 0,
    lastPurchaseAt: data.ultimaVisita && data.ultimaVisita !== "Sin visitas"
      ? Timestamp.fromDate(new Date(data.ultimaVisita))
      : null,
    // ... otros campos con valores por defecto
  }
}
```

**Entregable:** `lib/adapters.ts` con funciones de conversión legacy ↔ v2.

### Tarea 1.2: Crear estructura de API routes

**Qué hacer:**

```txt
app/api/
├── events/
│   └── emit/route.ts       → POST /api/events/emit
├── jobs/
│   ├── create/route.ts     → POST /api/jobs/create
│   └── process/route.ts    → POST /api/jobs/process (llamado por cron)
└── automations/
    ├── evaluate/route.ts   → POST /api/automations/evaluate
    └── execute/route.ts    → POST /api/automations/execute
```

**Cada API route debe:**
1. Validar autenticación mediante el token JWT (misma lógica que `middleware.ts`)
2. Extraer `companyId` del token o header
3. Validar permisos con Firestore rules (las reglas de seguridad aplican aunque el backend use Admin SDK)

**Archivo base para API routes:**

```ts
// app/api/_lib/auth.ts
import { admin } from "@/lib/firebase-admin"
import { NextRequest } from "next/server"

export async function getAuthCompany(req: NextRequest): Promise<{
  uid: string
  companyId: string
} | { error: Response }> {
  const token = req.cookies.get("firebase-auth-token")?.value
  if (!token) return { error: new Response("No autorizado", { status: 401 }) }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await admin.firestore().doc(`users/${decoded.uid}`).get()
    const companyId = userDoc.data()?.companyId
    if (!companyId) return { error: new Response("Sin empresa", { status: 403 }) }
    return { uid: decoded.uid, companyId }
  } catch {
    return { error: new Response("Token inválido", { status: 401 }) }
  }
}
```

**Nota:** Necesitas inicializar Firebase Admin SDK. Crear `lib/firebase-admin.ts`:

```ts
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

const apps = getApps()
const app = apps.length === 0
  ? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY!)) })
  : apps[0]

export const admin = {
  db: getFirestore(app),
  auth: getAuth(app),
}
```

**Requiere variable de entorno:** `FIREBASE_ADMIN_KEY` con el JSON de la service account.

### Tarea 1.3: Actualizar firestore.rules

**Qué hacer:**
Agregar reglas de seguridad para las nuevas colecciones. Ya tienes el archivo, solo falta desplegarlo.

Reglas necesarias adicionales:

```
// Dentro de match /companies/{companyId} { ... }

match /customers/{id} {
  allow read, write: if isAuth() && isInCompany(companyId)
                     && request.resource.data.companyId == companyId;
}

match /sales/{id} {
  allow read, write: if isAuth() && isInCompany(companyId)
                     && request.resource.data.companyId == companyId;
}

match /jobs/{id} {
  allow read: if isAuth() && isInCompany(companyId);
  allow create: if isAuth() && isInCompany(companyId)
                && request.resource.data.companyId == companyId
                && request.resource.data.status == "pending";
  allow update: if isAuth() && isInCompany(companyId)
                && request.resource.data.companyId == companyId;
  allow delete: if isAuth() && isInCompany(companyId);
}

match /automations/{id} {
  allow read: if isAuth() && isInCompany(companyId);
  allow write: if isAuth() && isInCompany(companyId);
}

match /automationExecutions/{id} {
  allow read: if isAuth() && isInCompany(companyId);
  allow create: if isAuth() && isInCompany(companyId);
}

match /events/{id} {
  allow read: if isAuth() && isInCompany(companyId);
  allow create: if isAuth() && isInCompany(companyId);
}
```

**Comando para desplegar:** `npx firebase deploy --only firestore:rules,firestore:indexes`

### Tarea 1.4: Crear helpers de utilidad

Crear `lib/automation.ts` con funciones helper:

```ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AutomationEventType } from "@/lib/types"

// =========================
// EMITIR EVENTOS
// =========================

export async function emitEvent(params: {
  companyId: string
  type: AutomationEventType
  data: Record<string, unknown>
  source: string
  correlationId?: string
}) {
  const { companyId, type, data, source, correlationId } = params
  const ref = collection(db, "companies", companyId, "events")
  await addDoc(ref, {
    type,
    data,
    source,
    correlationId: correlationId ?? null,
    timestamp: serverTimestamp(),
    companyId,
    createdAt: serverTimestamp(),
  })
}

// =========================
// CREAR JOBS
// =========================

export async function createJob(params: {
  companyId: string
  type: string
  payload: Record<string, unknown>
  scheduledAt?: Date | null
  priority?: "low" | "normal" | "high" | "critical"
  maxAttempts?: number
  group?: string
  automationId?: string
  tags?: string[]
}) {
  const ref = collection(db, "companies", params.companyId, "jobs")
  await addDoc(ref, {
    ...params,
    scheduledAt: params.scheduledAt ?? null,
    priority: params.priority ?? "normal",
    maxAttempts: params.maxAttempts ?? 3,
    status: "pending",
    attempts: 0,
    lastError: null,
    errorStack: [],
    result: null,
    startedAt: null,
    completedAt: null,
    duration: null,
    executedBy: null,
    tags: params.tags ?? [],
    version: 1,
    companyId: params.companyId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
```

### Tarea 1.5: Configurar Firebase Admin SDK

1. Ir a Firebase Console → Configuración del proyecto → Cuentas de servicio
2. Generar nueva clave privada
3. Guardar el JSON como variable de entorno en Vercel: `FIREBASE_ADMIN_KEY`
4. En desarrollo local: crear `.env.local` con `FIREBASE_ADMIN_KEY='{...}'`

---

## 6. Sprint 2 — Eventos + Jobs (días 6–12)

### Tarea 2.1: Emitir eventos desde las páginas existentes

Cada vez que un usuario realiza una acción, debemos emitir un evento. Modificar las páginas existentes para llamar a `emitEvent()`:

**En `clientes/page.tsx` — al crear cliente:**

```ts
// Después de añadir el cliente a Firestore:
await emitEvent({
  companyId,
  type: "customer.created",
  data: { customerId: newDocRef.id, name, phone },
  source: "crm",
})
```

**En `ventas/page.tsx` — al completar venta:**

```ts
await emitEvent({
  companyId,
  type: "sale.completed",
  data: { saleId, customerId, total, items },
  source: "pos",
  correlationId: saleId,
})
```

**En `inventario/page.tsx` — al crear/actualizar producto:**

```ts
// Si stock < stockMinimo después de actualizar:
await emitEvent({
  companyId,
  type: "inventory.low_stock",
  data: { productId, name, stock, stockMinimo },
  source: "inventory",
})
```

### Tarea 2.2: Implementar el Job Processor

Crear `app/api/jobs/process/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/firebase-admin"
import { getAuthCompany } from "@/app/api/_lib/auth"

export async function POST(req: NextRequest) {
  const auth = await getAuthCompany(req)
  if ("error" in auth) return auth.error

  const { companyId } = auth
  const db = admin.db

  // 1. Buscar hasta 10 jobs pendientes
  const snapshot = await db
    .collection(`companies/${companyId}/jobs`)
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", new Date())
    .orderBy("priority", "asc")
    .orderBy("scheduledAt", "asc")
    .limit(10)
    .get()

  if (snapshot.empty) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const doc of snapshot.docs) {
    const job = doc.data()

    // 2. Marcar como running
    await doc.ref.update({
      status: "running",
      startedAt: new Date(),
    })

    try {
      // 3. Ejecutar según el tipo
      const result = await executeJob(job)

      // 4. Marcar como completed
      await doc.ref.update({
        status: "completed",
        completedAt: new Date(),
        duration: Date.now() - job.startedAt?.toMillis() ?? 0,
        result,
      })

      processed++
    } catch (error: any) {
      const attempts = (job.attempts || 0) + 1
      const maxAttempts = job.maxAttempts || 3

      const errorEntry = {
        attempt: attempts,
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      }

      if (attempts >= maxAttempts) {
        // 5a. Fallo definitivo
        await doc.ref.update({
          status: "failed",
          attempts,
          lastError: error.message,
          errorStack: admin.firestore.FieldValue.arrayUnion(errorEntry),
          completedAt: new Date(),
        })
      } else {
        // 5b. Reintentar con backoff
        const delay = Math.min(1000 * Math.pow(2, attempts), 3600000)
        await doc.ref.update({
          status: "pending",
          attempts,
          lastError: error.message,
          errorStack: admin.firestore.FieldValue.arrayUnion(errorEntry),
          scheduledAt: new Date(Date.now() + delay),
        })
      }
    }
  }

  return NextResponse.json({ processed })
}

// Mapa de handlers por tipo de job
const handlers: Record<string, (job: any) => Promise<any>> = {
  send_whatsapp: async (job) => {
    // TODO: Sprint 4
    throw new Error("WhatsApp handler no implementado")
  },
  add_tag: async (job) => {
    const { customerId, tag } = job.payload
    await admin.db
      .doc(`companies/${job.companyId}/customers/${customerId}`)
      .update({ tags: admin.firestore.FieldValue.arrayUnion(tag) })
    return { tagAdded: tag }
  },
  // ... más handlers
}
```

### Tarea 2.3: Configurar cron job

En Vercel: ir a Settings → Cron Jobs → crear uno que llame a:

```
POST https://tudominio.vercel.app/api/jobs/process
```

Con frecuencia: `every 1 minute`

En desarrollo: se puede simular con curl o un botón manual.

### Tarea 2.4: Tests de jobs

Crear `tests/jobs.test.ts` (usando Jest o Vitest):

```ts
describe("Job lifecycle", () => {
  it("debe crear un job con status pending", async () => {
    // ...
  })

  it("debe procesar un job y marcarlo como completed", async () => {
    // ...
  })

  it("debe reintentar con backoff cuando falla", async () => {
    // ...
  })

  it("debe marcar como failed cuando se agotan los reintentos", async () => {
    // ...
  })
})
```

---

## 7. Sprint 3 — Automatizaciones (días 13–20)

### Tarea 3.1: Sistema de evaluación de triggers

Cada vez que se emite un evento, el sistema debe evaluar si alguna automatización coincide:

```
Evento emitido → ¿alguna Automation tiene trigger.event = este tipo?
                      ↓
               ¿Se cumplen las condiciones?
                      ↓
               Crear AutomationExecution + Jobs
```

Implementar en `app/api/automations/evaluate/route.ts`:

```ts
export async function POST(req: NextRequest) {
  const { companyId, eventType, eventData } = await req.json()

  // Buscar automatizaciones activas que coincidan con el evento
  const automations = await db
    .collection(`companies/${companyId}/automations`)
    .where("enabled", "==", true)
    .where("trigger.event", "==", eventType)
    .get()

  for (const doc of automations.docs) {
    const auto = doc.data()

    // Evaluar condiciones
    const conditionsMet = evaluateConditions(auto.trigger.conditions, eventData)
    if (!conditionsMet) continue

    // Crear AutomationExecution
    const execRef = await db
      .collection(`companies/${companyId}/automationExecutions`)
      .add({
        automationId: doc.id,
        triggerEvent: eventType,
        status: "running",
        customerId: eventData.customerId ?? null,
        saleId: eventData.saleId ?? null,
        jobIds: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    // Crear Jobs para cada acción
    const jobIds: string[] = []
    for (const action of auto.actions.sort((a: any, b: any) => a.order - b.order)) {
      const jobId = await createJobForAction(companyId, action, eventData, doc.id)
      jobIds.push(jobId)
    }

    // Actualizar execution con los jobIds
    await execRef.update({ jobIds })

    // Actualizar contador en la automatización
    await doc.ref.update({
      executionCount: (auto.executionCount || 0) + 1,
      lastTriggeredAt: new Date(),
    })
  }
}
```

### Tarea 3.2: Evaluación de condiciones

Implementar `evaluateConditions()`:

```ts
function evaluateConditions(
  conditions: AutomationCondition[],
  eventData: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true

  return conditions.every((c) => {
    const actual = get(eventData, c.field)
    switch (c.operator) {
      case "eq": return actual === c.value
      case "neq": return actual !== c.value
      case "gt": return Number(actual) > Number(c.value)
      case "gte": return Number(actual) >= Number(c.value)
      case "lt": return Number(actual) < Number(c.value)
      case "lte": return Number(actual) <= Number(c.value)
      case "contains": return String(actual).includes(String(c.value))
      case "in": return Array.isArray(c.value) && c.value.includes(actual)
      case "not_in": return Array.isArray(c.value) && !c.value.includes(actual)
      default: return false
    }
  })
}

// Helper para acceder a propiedades anidadas: get({a: {b: 1}}, "a.b") → 1
function get(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj)
}
```

### Tarea 3.3: Tests de automatizaciones

```ts
describe("Automation evaluation", () => {
  it("debe gatillar una automatización cuando el evento coincide", () => {})
  it("debe NO gatillar si las condiciones no se cumplen", () => {})
  it("debe crear un AutomationExecution por cada gatillado", () => {})
  it("debe crear jobs para cada acción en orden", () => {})
  it("debe evaluar correctamente todos los operadores (eq, gt, contains, etc.)", () => {})
})
```

---

## 8. Sprint 4 — Workers + Producción (días 21–30)

### Tarea 4.1: Worker de WhatsApp

Implementar `send_whatsapp` handler en el job processor:

```ts
send_whatsapp: async (job) => {
  const { to, template, variables } = job.payload
  
  // Usar API de WhatsApp Business (Meta Cloud API)
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${whatsappPhoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: "es" },
          components: [{
            type: "body",
            parameters: variables.map((v: string) => ({ type: "text", text: v })),
          }],
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`WhatsApp API error: ${error}`)
  }

  const result = await response.json()
  
  // Actualizar lastWhatsAppAt del cliente
  if (job.payload.customerId) {
    await admin.db
      .doc(`companies/${job.companyId}/customers/${job.payload.customerId}`)
      .update({ lastWhatsAppAt: new Date() })
  }

  return { messageId: result.messages?.[0]?.id }
}
```

**Rate limiting:** Máximo 15 mensajes/minuto por número de negocio. Usar el campo `group: "whatsapp"` en jobs para procesar con throttle:

```ts
// En el job processor, agrupar por group y limitar
const whatsappJobs = pendingJobs.filter(j => j.group === "whatsapp")
const batch = whatsappJobs.slice(0, 15) // máximo 15 por lote
```

### Tarea 4.2: TTL y limpieza

Los jobs completados y los eventos viejos deben limpiarse automáticamente:

```ts
// app/api/cron/cleanup/route.ts
export async function POST() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 días

  // Limpiar jobs completed/failed antiguos
  const oldJobs = await db
    .collectionGroup("jobs")
    .where("status", "in", ["completed", "failed", "cancelled"])
    .where("completedAt", "<", cutoff)
    .get()

  const batch = db.batch()
  oldJobs.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()

  // Limpiar eventos antiguos
  const oldEvents = await db
    .collectionGroup("events")
    .where("timestamp", "<", cutoff)
    .get()

  const batch2 = db.batch()
  oldEvents.docs.forEach(d => batch2.delete(d.ref))
  await batch2.commit()
}
```

### Tarea 4.3: Monitoreo

Implementar dashboard de monitoreo interno:

- **Jobs fallidos en las últimas 24h** — alerta si > 10
- **Jobs pendientes acumulados** — alerta si > 100
- **Tiempo promedio de procesamiento** — alerta si > 30s
- **Porcentaje de éxito** — alerta si < 95%

```ts
// app/api/monitoring/stats/route.ts
export async function GET(req: NextRequest) {
  const auth = await getAuthCompany(req)
  if ("error" in auth) return auth.error

  const { companyId } = auth
  const db = admin.db

  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [failedJobs, pendingJobs, avgDuration] = await Promise.all([
    db.collection(`companies/${companyId}/jobs`)
      .where("status", "==", "failed")
      .where("completedAt", ">=", last24h)
      .get(),
    db.collection(`companies/${companyId}/jobs`)
      .where("status", "==", "pending")
      .get(),
    // ... calcular duración promedio
  ])

  return NextResponse.json({
    failedCount: failedJobs.size,
    pendingCount: pendingJobs.size,
    // ...
  })
}
```

### Tarea 4.4: UI de Automatizaciones

Interfaz básica para que el usuario cree automatizaciones:

```txt
/app/(protected)/automatizaciones/
├── page.tsx              → Lista de automatizaciones
└── [id]/page.tsx         → Editor de automatización
```

Componentes necesarios:
- `TriggerSelector` — elegir evento o schedule
- `ConditionBuilder` — agregar condiciones (campo + operador + valor)
- `ActionSelector` — elegir acción (whatsapp, email, tag, webhook)
- `ActionConfigurator` — configurar cada acción según su tipo

---

## 9. Preguntas frecuentes

### ¿Migro los datos existentes de clientes/ventas o los dejo como están?

**Deja los datos legacy como están.** Las páginas actuales siguen funcionando con los campos en español. Los nuevos desarrollos (automatizaciones, eventos, jobs) usan los nuevos modelos en inglés con `customers/`, `sales/` (nombre en inglés). La migración se hace cuando refactors cada página.

### ¿Uso colecciones con nombres en español (clientes) o inglés (customers)?

Ambas coexisten por ahora. Las páginas legacy usan `clientes/`. Los nuevos módulos usan `customers/`, `sales/`, `jobs/`, `automations/`, `events/`. Cuando refactors una página legacy, migras sus datos a la colección nueva con el adaptador.

### ¿Necesito Firebase Blaze Plan?

Sí. Para usar Firebase Admin SDK con Cloud Functions o Vercel cron jobs, necesitas el plan Blaze (pago por uso). El costo estimado para 1,000 empresas es ~$0.31/mes en Firestore + costo de workers.

### ¿Puedo usar Vercel cron jobs gratis?

Vercel Hobby no tiene cron jobs. Vercel Pro tiene cron jobs integrados. Alternativa gratuita: usar `easycron.com` o `cron-job.org` para llamar `POST /api/jobs/process` cada minuto.

### ¿Cómo pruebo localmente las automatizaciones?

1. Iniciar `npm run dev`
2. Ejecutar manualmente: `curl -X POST http://localhost:3000/api/jobs/process`
3. O crear un botón en la UI de desarrollo que ejecute el processor

### ¿Qué hago si un job falla siempre?

1. Revisar `lastError` y `errorStack` en el documento del job
2. Ver logs de la API route en Vercel
3. Si es error de API externa (WhatsApp, Email), verificar tokens y cuotas
4. Si es lógico, corregir el handler y reiniciar el job: `status = "pending"`, `attempts = 0`

---

## 10. Contacto y recursos

### Archivos clave del proyecto

| Archivo | Qué contiene |
|---------|-------------|
| `lib/types.ts` | Todas las interfaces TypeScript |
| `lib/firebase.ts` | Inicialización Firebase Client SDK |
| `lib/firebase-admin.ts` | Inicialización Firebase Admin SDK (CREAR) |
| `lib/automation.ts` | Helpers: emitEvent, createJob (CREAR) |
| `docs/ARQUITECTURA_AUTOMATIZACIONES.md` | Documento completo de arquitectura |
| `firestore.indexes.json` | Índices compuestos |
| `firestore.rules` | Reglas de seguridad (ACTUALIZAR) |
| `middleware.ts` | Protección de rutas con JWT |

### Referencias externas

- **Firestore docs**: https://firebase.google.com/docs/firestore
- **Firebase Admin SDK**: https://firebase.google.com/docs/admin/setup
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs
- **shadcn/ui**: https://ui.shadcn.com

### Checklist final pre-producción

- [ ] TypeScript compila sin errores (`npx tsc --noEmit --strict`)
- [ ] `firestore.rules` desplegadas con nuevas colecciones
- [ ] `firestore.indexes.json` desplegado
- [ ] Firebase Admin SDK configurado y funcionando
- [ ] API route `/api/jobs/process` responde correctamente
- [ ] Cron job configurado ejecutando cada 1 minuto
- [ ] Eventos se emiten desde todas las páginas (clientes, ventas, inventario)
- [ ] Jobs se crean, procesan, reintentan y completan correctamente
- [ ] Automatizaciones se evalúan y ejecutan cuando se emiten eventos
- [ ] TTL/limpieza automática de jobs y eventos > 90 días
- [ ] Monitoreo básico implementado
- [ ] Tests: pipeline evento → trigger → job → worker

---

*Fin del informe. Cualquier duda sobre la arquitectura, revisar `docs/ARQUITECTURA_AUTOMATIZACIONES.md` o consultar al Staff Engineer.*
