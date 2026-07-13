# Arquitectura de Automatizaciones — Novent

> Documento de diseño para la nueva arquitectura de automatizaciones multiempresa sobre Next.js 16 + Firestore.

---

## Índice

1. [Visión General](#1-visión-general)
2. [Colección Jobs](#2-colección-jobs)
3. [Modelo de Clientes (CRM v2)](#3-modelo-de-clientes-crm-v2)
4. [Modelo de Ventas (Sales v2)](#4-modelo-de-ventas-sales-v2)
5. [Eventos de Automatización](#5-eventos-de-automatización)
6. [Esquema Firestore Completo](#6-esquema-firestore-completo)
7. [Escalabilidad](#7-escalabilidad)
8. [Arquitectura de Procesamiento](#8-arquitectura-de-procesamiento)
9. [Recomendaciones](#9-recomendaciones)
10. [Errores de Diseño a Evitar](#10-errores-de-diseño-a-evitar)
11. [Versión Recomendada para Producción](#11-versión-recomendada-para-producción)

---

## 1. Visión General

### Diagrama conceptual

```
┌─────────────────────────────────────────────────────────┐
│                    Novent Platform                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   CRM    │  │   POS    │  │Inventory │  │Dashboard│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│  ┌────▼──────────────▼──────────────▼──────────────▼┐    │
│  │                  Event Bus                        │    │
│  │  customer.created  sale.completed  low_stock      │    │
│  └───────────────────────┬──────────────────────────┘    │
│                          │                                │
│  ┌───────────────────────▼──────────────────────────┐    │
│  │              Automation Engine                     │    │
│  │  Match triggers → Evaluate conditions → Create    │    │
│  │  jobs                                              │    │
│  └───────────────────────┬──────────────────────────┘    │
│                          │                                │
│  ┌───────────────────────▼──────────────────────────┐    │
│  │                 Jobs Queue                        │    │
│  │  pending → running → completed / failed / retry   │    │
│  └───────────────────────┬──────────────────────────┘    │
│                          │                                │
│  ┌───────────────────────▼──────────────────────────┐    │
│  │            Execution Workers                      │    │
│  │  WhatsApp  │  Email  │  SMS  │  Webhooks  │ Tags  │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Flujo de datos

```
Acción usuario     Evento             Regla              Job              Ejecución
   │                  │                  │                  │                  │
   ├─ Crear cliente──►│ customer.created │                  │                  │
   │                  ├─────────────────►│ ¿Coincide?       │                  │
   │                  │                  ├─► Crear Job ────►│ pending          │
   │                  │                  │                  ├─► Worker ──────►│ WhatsApp
   │                  │                  │                  │  running        │
   │                  │                  │                  │  completed ◄───┘
```

---

## 2. Colección Jobs

### Propósito

Cada "job" representa una unidad de trabajo atómica. Es el bloque fundamental del motor de automatización. Todo lo que el sistema necesita ejecutar (enviar un WhatsApp, evaluar una condición, llamar un webhook) se modela como un job.

### Firestore Schema

```
/companies/{companyId}/jobs/{jobId}
```

### TypeScript Interface

Definida en `lib/types.ts` como `Job`.

### Explicación de cada campo

| Campo | Tipo | ¿Por qué existe? |
|-------|------|-----------------|
| `type` | `JobType` | Discrimina qué worker debe procesar este job. Sin esto no sabemos qué handler invocar. |
| `status` | `JobStatus` | **Único campo mutable clave** — permite a los workers encontrar trabajos pendientes (`pending`), saber cuáles están en ejecución (`running`) y cuáles fallaron (`failed`). |
| `priority` | `low\|normal\|high\|critical` | Para ordenar la cola. Un recordatorio de cumpleaños puede ser `low`; un mensaje de confirmación de pago debe ser `high`. |
| `scheduledAt` | `Timestamp\|null` | Permite ejecución diferida. Si es `null`, el job es inmediato. Si tiene fecha futura, el worker no lo toca hasta esa fecha. |
| `startedAt` | `Timestamp\|null` | Para medir cuánto tiempo lleva ejecutándose y detectar jobs "zombie" (running por más de N minutos sin completarse). |
| `completedAt` | `Timestamp\|null` | Fin de ejecución. Útil para estadísticas de performance del sistema y auditoría. |
| `duration` | `number\|null` | `completedAt - startedAt` en ms. Permite generar alertas si los jobs están tardando más de lo normal. |
| `attempts` | `number` | Cuántas veces se ha intentado ejecutar. Se incrementa en cada intento. |
| `maxAttempts` | `number` | Límite de reintentos. Si `attempts >= maxAttempts` y falla, pasa a `failed`. |
| `lastError` | `string\|null` | Mensaje del último error. Útil para debugging rápido sin leer todo el `errorStack`. |
| `errorStack` | `JobError[]` | Historial completo de errores. Cada entrada contiene `attempt`, `message`, `stack` y `timestamp`. Permite auditoría forense. |
| `payload` | `Record<string, unknown>` | **La carga útil del job.** Contiene todos los datos que el worker necesita: ID del cliente, ID de la venta, texto del mensaje, etc. |
| `result` | `Record<string, unknown>\|null` | Output del worker tras ejecución. Por ejemplo, el `messageId` devuelto por WhatsApp. |
| `executedBy` | `string\|null` | `userId` del usuario que disparó el job, o `"system"`. Para auditoría. |
| `automationId` | `string\|null` | Traza de qué automatización generó este job. Permite cancelar todos los jobs de una automatización deshabilitada. |
| `group` | `string\|null` | Grupo de rate limiting. Ej: `"whatsapp"` — si hay 10 jobs de WhatsApp pendientes, se procesan con un throttle de N mensajes/min. |
| `tags` | `string[]` | Metadatos libres para filtrar. Ej: `["campaign:verano", "batch:2024-12"]`. |
| `version` | `number` | Permite migraciones futuras del schema. Si cambiamos la estructura de `payload`, incrementamos la versión y los workers deciden cómo manejar cada versión. |

### Estados y transiciones

```
                  ┌─────────┐
                  │ pending │◄────────── Creación
                  └────┬────┘
                       │ Worker toma el job
                       ▼
                  ┌─────────┐
           ┌──────│ running │──────┐
           │      └─────────┘      │
           │                       │
           ▼                       ▼
     ┌───────────┐          ┌───────────┐
     │ completed │          │  failed   │◄────────── Se agotaron reintentos
     └───────────┘          └─────┬─────┘
                                  │
                         ┌────────┴────────┐
                         ▼                  ▼
                   ┌──────────┐      ┌──────────┐
                   │ retrying │      │cancelled │
                   └────┬─────┘      └──────────┘
                        │ (siguiente intento)
                        ▼
                    ┌─────────┐
                    │ pending │
                    └─────────┘
```

El estado `retrying` no existe como valor directo — cuando un job en `running` falla y `attempts < maxAttempts`, se vuelve a marcar `pending`. Pero el `errorStack` y `attempts` preservan el historial.

### Reglas de reintento

```typescript
function shouldRetry(job: Job): boolean {
  if (job.status !== "failed") return false
  if (job.attempts >= job.maxAttempts) return false
  return true
}

function nextRetryDelay(job: Job): number {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, job.attempts), 3600000) // max 1h
}
```

---

## 3. Modelo de Clientes (CRM v2)

### Propósito

El cliente es la entidad central del CRM y el sujeto de la mayoría de automatizaciones. El modelo actual (`nombre, telefono, estado, visitas, totalGastado, ultimaVisita`) es insuficiente para segmentación avanzada, scoring y flujos condicionales.

### Firestore Schema

```
/companies/{companyId}/customers/{customerId}
```

### TypeScript Interface

Definida en `lib/types.ts` como `Customer`.

### Explicación de cada propiedad

| Propiedad | Tipo | Propósito |
|-----------|------|-----------|
| `name` | `string` | Nombre del cliente. Campo obligatorio básico. |
| `phone` | `string` | **Clave de comunicación**. Sin teléfono no hay WhatsApp ni SMS. |
| `email` | `string\|null` | Para email marketing y recuperación de cuenta. |
| `photoURL` | `string\|null` | Foto de perfil. Mejora la experiencia del staff. |
| `birthday` | `Timestamp\|null` | Permite automatizaciones de cumpleaños (ej: "¡Feliz cumpleaños! 20% de descuento"). |
| `totalSpent` | `number` | Suma total gastada. Usado para segmentación por valor (VIP). |
| `visitCount` | `number` | Número de visitas. Definición de "cliente frecuente". |
| `averageTicket` | `number` | `totalSpent / visitCount`. Segmentación por ticket promedio. |
| `lifetimeValue` | `number` | Proyección del valor futuro del cliente. Combina frecuencia × ticket × tiempo de retención. |
| `firstPurchaseAt` | `Timestamp\|null` | Primera compra. Para campañas de "aniversario". |
| `lastPurchaseAt` | `Timestamp\|null` | Última compra. Para detectar inactividad y riesgo de churn. |
| `tags` | `string[]` | **Sistema de etiquetado flexible.** Ej: `["prefiere WhatsApp", "cortes modernos", "fiel"]`. Base para segmentación. |
| `status` | `lead\|active\|vip\|inactive\|lost` | Estado del ciclo de vida. Cada transición puede disparar automatizaciones. |
| `source` | `CustomerSource` | Canal de adquisición. Permite medir qué canal trae mejores clientes. |
| `consent` | `CustomerConsent` | **Cumplimiento legal.** Registra qué canales de comunicación tiene autorizados el cliente. |
| `preferredContactMethod` | `ContactMethod` | Evita enviar WhatsApp a quien prefiere email, o viceversa. |
| `notes` | `string` | Notas internas del staff. |
| `customFields` | `Record<string, unknown>` | **Campos personalizados por negocio.** Una barbería puede tener "barbero preferido"; un spa puede tener "alergias". |
| `referrerId` | `string\|null` | Cliente que lo recomendó. Para campañas de referidos. |
| `churnRisk` | `low\|medium\|high` | Scoring de riesgo. Calculado periódicamente en batch. Permite automatizaciones proactivas de retención. |
| `lastRating` | `number\|null` | Calificación 1-5 del último servicio. Permite campañas post-servicio. |
| `lastInteractionAt` | `Timestamp\|null` | Última interacción con el negocio (compra, llamado, WhatsApp). Para detectar inactividad. |
| `lastWhatsAppAt` | `Timestamp\|null` | Último mensaje de WhatsApp enviado. Para evitar spam. |
| `lastEmailAt` | `Timestamp\|null` | Último email enviado. |
| `automationState` | `Record<string, unknown>` | **Estado interno de las automatizaciones.** Ej: una automatización de "bienvenida" guarda aquí `{ welcome_sent: true }` para no enviar dos veces. |

### Campos adicionales de un CRM moderno

- `socialProfiles: Record<string, string>` — Instagram, Facebook, TikTok del cliente
- `location: GeoPoint` — Ubicación para segmentación geográfica
- `companyName: string` — Si es cliente corporativo
- `emergencyContact: { name, phone, relationship }` — Para salones/spas
- `favoriteProducts: string[]` — IDs de productos favoritos
- `lastCampaignId: string` — Última campaña que recibió
- `segmentScores: Record<string, number>` — Scores para cada segmento (alto gastador, frecuente, etc.)
- `nextAppointmentAt: Timestamp | null` — Próxima cita agendada
- `totalSavings: number` — Total ahorrado (programa de fidelidad)
- `referralCode: string` — Código único de referido

---

## 4. Modelo de Ventas (Sales v2)

### Propósito

El modelo actual (`cliente, servicio, precio, fecha`) es demasiado simple. Para automatizaciones necesitamos conocer el estado del pago, los items individuales, los descuentos, los impuestos, y el ciclo de vida completo de la venta.

### Firestore Schema

```
/companies/{companyId}/sales/{saleId}
```

### TypeScript Interface

Definida en `lib/types.ts` como `Sale`.

### Explicación de campos clave

| Campo | Propósito |
|-------|-----------|
| `customerId` | Relación con el cliente. Permite disparar eventos `sale.completed` vinculados al customer. |
| `customerName`, `customerPhone` | Datos desnormalizados para mostrar en listados sin hacer JOIN. |
| `items` | Array de productos/servicios. Permite análisis de qué productos se venden juntos. |
| `subtotal` | Suma de items antes de descuentos e impuestos. |
| `discountTotal` | Descuento global aplicado. Permite automatizaciones como "si total > $500, aplicar 10% descuento". |
| `taxTotal` | Impuestos. Separación contable. |
| `total` | `subtotal - discountTotal + taxTotal`. |
| `paymentMethod` | `cash\|card\|transfer\|mercadopago\|qr\|other`. Permite agrupar ventas por método de pago. |
| `paymentStatus` | `pending\|paid\|refunded\|partial`. Clave para automatizaciones: "si pasan 24h y paymentStatus = pending, enviar recordatorio". |
| `paidAt` | Momento exacto del pago. Para reportes y reconciliación. |
| `status` | Ciclo de vida completo: `pending → completed → cancelled → refunded`. |
| `cancelledAt`, `cancellationReason` | Trazabilidad de cancelaciones. |
| `sellerId` | Staff que atendió. Para comisiones y análisis de performance. |
| `events` | **Auditoría completa.** Cada evento (`created`, `completed`, `cancelled`, etc.) se registra con timestamp. Esto permite reconstruir la línea de tiempo de cualquier venta. |
| `automationState` | Similar a customer — las automatizaciones guardan aquí su estado para no repetir acciones. |

### Eventos de ciclo de vida de una venta

```
[Created] ──► [Payment Received] ──► [Completed]
   │                                       │
   │                                       ├──► [Refunded]
   │                                       │
   └──► [Cancelled] ◄──────────────────────┘
```

---

## 5. Eventos de Automatización

### Lista completa

#### Clientes

| Evento | Cuándo se dispara | Ejemplo de automatización |
|--------|-------------------|---------------------------|
| `customer.created` | Se crea un cliente nuevo | Enviar WhatsApp de bienvenida |
| `customer.updated` | Se modifica cualquier campo | Sincronizar con CRM externo |
| `customer.status_changed` | Cambia `status` (lead → active, etc.) | Si pasa a VIP, enviar oferta especial |
| `customer.tag_added` | Se agrega una etiqueta | Si tag = "cumpleaños", enviar cupón |
| `customer.tag_removed` | Se elimina una etiqueta | Remover de campaña |
| `customer.visit_completed` | Se registra una venta vinculada | Pedir calificación del servicio |
| `customer.birthday` | Es el cumpleaños (evento schedule-driven) | Enviar "Feliz cumpleaños" + descuento |
| `customer.inactive_detected` | No visita en X días (batch detection) | Enviar "Te extrañamos" + oferta |
| `customer.churn_risk_changed` | Scoring de riesgo cambia | Si riesgo es alto, ofrecer promoción |
| `customer.consent_updated` | Cliente cambia preferencias | Actualizar lista de contacto |
| `customer.rating_submitted` | Cliente califica servicio | Si rating < 3, notificar al gerente |

#### Ventas

| Evento | Cuándo se dispara | Ejemplo de automatización |
|--------|-------------------|---------------------------|
| `sale.created` | Se inicia una venta | Agregar items al inventario |
| `sale.completed` | Venta pagada y cerrada | Enviar recibo por WhatsApp |
| `sale.cancelled` | Venta cancelada | Restaurar inventario, preguntar motivo |
| `sale.refunded` | Devolución | Notificar al staff |
| `sale.payment_received` | Pago confirmado (puede ser después de creada) | Enviar confirmación |
| `sale.payment_failed` | Pago rechazado | Notificar al cliente para reintentar |

#### Inventario

| Evento | Cuándo se dispara | Ejemplo de automatización |
|--------|-------------------|---------------------------|
| `inventory.low_stock` | `stock < stockMinimo` | Notificar al gerente, crear orden de compra |
| `inventory.out_of_stock` | `stock = 0` | Ocultar producto, notificar urgencia |
| `inventory.restocked` | Se agrega stock | Reactivar producto si estaba oculto |
| `inventory.product_created` | Nuevo producto | Sincronizar con catálogo de WhatsApp |

#### Negocio

| Evento | Cuándo se dispara | Ejemplo de automatización |
|--------|-------------------|---------------------------|
| `business.daily_summary` | Fin del día (scheduled) | Enviar resumen de ventas al dueño |
| `business.weekly_report` | Fin de semana | Enviar reporte semanal |
| `automation.trigger_matched` | Una condición de automatización se cumple | Encadenar automatizaciones |

### Estructura del evento en Firestore

```
/companies/{companyId}/events/{eventId}
```

```typescript
{
  id: "ev_abc123",
  companyId: "comp_xyz",
  type: "sale.completed",
  data: {
    saleId: "sale_456",
    customerId: "cust_789",
    total: 45000,
    items: ["Corte", "Barba"]
  },
  source: "pos",
  timestamp: Timestamp(2026, 6, 22, 15, 30, 0),
  correlationId: "corr_001"
}
```

---

## 6. Esquema Firestore Completo

```
/users/{uid}
  ├── email: string
  ├── companyId: string
  ├── role: string
  └── createdAt: Timestamp

/companies/{companyId}
  ├── name: string
  ├── owner: string (uid)
  ├── settings: CompanySettings (map)
  └── createdAt: Timestamp

/companies/{companyId}/users/{uid}
  ├── email: string
  ├── name: string
  ├── role: UserRole
  ├── phone: string | null
  ├── active: boolean
  └── createdAt: Timestamp

/companies/{companyId}/customers/{customerId}
  ├── name: string
  ├── phone: string
  ├── email: string | null
  ├── photoURL: string | null
  ├── birthday: Timestamp | null
  ├── totalSpent: number
  ├── visitCount: number
  ├── averageTicket: number
  ├── lifetimeValue: number
  ├── firstPurchaseAt: Timestamp | null
  ├── lastPurchaseAt: Timestamp | null
  ├── tags: string[]
  ├── status: string ("active" | "lead" | "vip" | "inactive" | "lost")
  ├── source: string | null
  ├── consent: { whatsapp: bool, email: bool, sms: bool, updatedAt: Timestamp }
  ├── preferredContactMethod: string
  ├── notes: string
  ├── customFields: map
  ├── referrerId: string | null
  ├── churnRisk: string
  ├── lastRating: number | null
  ├── lastInteractionAt: Timestamp | null
  ├── lastWhatsAppAt: Timestamp | null
  ├── lastEmailAt: Timestamp | null
  ├── automationState: map
  ├── companyId: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

/companies/{companyId}/sales/{saleId}
  ├── customerId: string | null
  ├── customerName: string | null
  ├── customerPhone: string | null
  ├── items: [{
  │     productId: string,
  │     productName: string,
  │     category: string,
  │     quantity: number,
  │     unitPrice: number,
  │     discount: number,
  │     tax: number,
  │     subtotal: number,
  │     total: number
  │   }]
  ├── subtotal: number
  ├── discountTotal: number
  ├── taxTotal: number
  ├── total: number
  ├── paymentMethod: string
  ├── paymentStatus: string
  ├── paidAt: Timestamp | null
  ├── status: string
  ├── cancelledAt: Timestamp | null
  ├── cancellationReason: string | null
  ├── refundedAt: Timestamp | null
  ├── sellerId: string | null
  ├── notes: string | null
  ├── events: [{ type, timestamp, userId, data }]
  ├── automationState: map
  ├── companyId: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

/companies/{companyId}/inventory/{productId}
  ├── name: string
  ├── description: string | null
  ├── category: string
  ├── price: number
  ├── cost: number | null
  ├── stock: number
  ├── stockMinimo: number
  ├── sku: string | null
  ├── barcode: string | null
  ├── active: boolean
  ├── companyId: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

/companies/{companyId}/jobs/{jobId}
  ├── type: string
  ├── status: string ("pending" | "running" | "completed" | "failed" | "cancelled")
  ├── priority: string
  ├── scheduledAt: Timestamp | null
  ├── startedAt: Timestamp | null
  ├── completedAt: Timestamp | null
  ├── duration: number | null
  ├── attempts: number
  ├── maxAttempts: number
  ├── lastError: string | null
  ├── errorStack: [{ attempt, message, stack?, timestamp }]
  ├── payload: map
  ├── result: map | null
  ├── executedBy: string | null
  ├── automationId: string | null
  ├── group: string | null
  ├── tags: string[]
  ├── version: number
  ├── companyId: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

/companies/{companyId}/automations/{automationId}
  ├── name: string
  ├── description: string | null
  ├── enabled: boolean
  ├── trigger: { event, schedule, conditions }
  ├── actions: [{ type, config, order }]
  ├── lastTriggeredAt: Timestamp | null
  ├── executionCount: number
  ├── createdBy: string
  ├── tags: string[]
  ├── companyId: string
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp

/companies/{companyId}/events/{eventId}
  ├── type: string
  ├── data: map
  ├── source: string
  ├── timestamp: Timestamp
  ├── correlationId: string | null
  ├── companyId: string
  └── createdAt: Timestamp
```

### Índices requeridos

```json
{
  "indexes": [
    // Jobs: workers buscan jobs pendientes, ordenados por prioridad y fecha programada
    {
      "collectionGroup": "jobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "ASCENDING" },
        { "fieldPath": "scheduledAt", "order": "ASCENDING" }
      ]
    },
    // Jobs: buscar por tipo + status (ej: todos los whatsapp pendientes)
    {
      "collectionGroup": "jobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    // Clientes: filtrar por status + totalGastado
    {
      "collectionGroup": "customers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "totalSpent", "order": "DESCENDING" }
      ]
    },
    // Clientes: filtrar por tags
    {
      "collectionGroup": "customers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "tags", "order": "ASCENDING" }
      ]
    },
    // Ventas: filtrar por cliente
    {
      "collectionGroup": "sales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "customerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Ventas: por estado + fecha
    {
      "collectionGroup": "sales",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Events: históricos por tipo
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 7. Escalabilidad

### 100 empresas

| Métrica | Valor estimado |
|---------|---------------|
| Clientes por empresa | 200–2.000 |
| Ventas/mes por empresa | 100–500 |
| Jobs/mes por empresa | 50–300 |
| **Total clientes** | ~200K |
| **Total ventas/mes** | ~50K |
| **Total jobs/mes** | ~30K |
| Writes/s promedio | ~0.03 (insignificante) |

**Veredicto: Sin problemas.** Firestore maneja esta carga sin necesidad de optimizaciones.

### 1.000 empresas

| Métrica | Valor estimado |
|---------|---------------|
| Total clientes | ~2M |
| Total ventas/mes | ~500K |
| Total jobs/mes | ~300K |
| Writes/s promedio | ~0.3 |
| Writes/s pico | ~10–50 (hora pico: 10–11 AM) |

**Veredicto: Sin problemas con la configuración adecuada.**
- Los índices compuestos deben planificarse
- Los workers deben usar batch writes para crear jobs
- La colección `events` puede crecer rápidamente → implementar TTL

### 10.000 empresas

| Métrica | Valor estimado |
|---------|---------------|
| Total clientes | ~20M |
| Total ventas/mes | ~5M |
| Total jobs/mes | ~3M |
| Writes/s promedio | ~3 |
| Writes/s pico | ~100–300 |

**Veredicto: Posibles cuellos de botella. Requiere arquitectura defensiva.**

### Cuellos de botella identificados

| # | Cuello de botella | Impacto | Mitigación |
|---|------------------|---------|-----------|
| 1 | **Colección `jobs` — contención de escritura** a alta frecuencia | Jobs de una misma compañía se escriben en el mismo rango de documentos. Firestore limita a 1 write/s por documento. | Shardear `jobs` con un prefijo hash de `companyId` para distribuir escrituras. |
| 2 | **Colección `events` — crecimiento ilimitado** | Cada acción de usuario crea un evento. A 10K empresas, pueden ser millones de eventos/mes. Eventos históricos encarecen las lecturas. | Implementar TTL (borrar eventos > 90 días) o migrar a BigQuery para análisis históricos. |
| 3 | **Real-time listeners (`onSnapshot`)** en colecciones grandes | Si cada empresa tiene un dashboard con `onSnapshot` en `jobs` filtrando por status, Firestore cobra 1 read por cada documento existente en cada conexión. | Usar agregaciones precalculadas para dashboards. Limitar listeners a documentos individuales o queries con mucha selectividad. |
| 4 | **Queries con `array-contains` en tags** con alta cardinalidad | `array-contains` no escala bien con tags muy diversos (100+ tags distintos). | Limitar tags por cliente a ~20. Indexar tags más comunes de forma separada. |
| 5 | **Límite de 200 composite indexes** por base de datos | A medida que crecen los casos de uso, el número de índices puede acercarse al límite. | Auditar y eliminar índices no usados. Preferir `map` fields con notación de punto para queries flexibles. |
| 6 | **Límite de 20,000 index entries por documento** | Un cliente con muchos tags (100+) y muchos arrays puede excederlo. | Limitar arrays (tags, customFields keys) a tamaños razonables. |

### Mejoras futuras para escala masiva

1. **Firestore en modo Datastore** (sin real-time listeners) + capa de caché con Redis
2. **Separación de bases de datos por shard** (ej: empresas A–M en db1, N–Z en db2)
3. **Job processor externo** con cola dedicada (Google Cloud Tasks, RabbitMQ, Redis Queue)
4. **Agregaciones en BigQuery** para reportes históricos sin impactar la base operacional
5. **Cache de segmentación** (tags, status, etc.) en memoria para reducir lecturas repetitivas
6. **Arquitectura híbrida**: Firestore para datos operacionales (clientes activos, ventas recientes) + almacenamiento frío (Google Cloud Storage + BigQuery) para datos históricos

---

## 8. Arquitectura de Procesamiento

### Opción A: Workers vía API Routes de Next.js (MVP)

Para la versión inicial sin Cloud Functions, los workers pueden ejecutarse como API routes:

```
1. Se crea un job → status = "pending"
2. Un cron job (cada 30s o 1min) llama a:
   POST /api/jobs/process
3. La API route:
   a. Query: jobs where status = "pending" AND scheduledAt <= now
   b. Batch update: status = "running", startedAt = now
   c. Ejecuta el handler según el type
   d. Update: status = "completed" | "failed"
```

**Ventajas:** No requiere configuración adicional de infraestructura.
**Desventajas:** Timeout de 60s en Vercel Serverless (los jobs deben ser rápidos). No escala a mucho volumen.

### Opción B: Workers con Cloud Tasks (recomendado para producción)

```
1. Se crea un job → status = "pending"
2. Se encola una tarea en Google Cloud Tasks
3. Cloud Tasks ejecuta un Cloud Function (o HTTP endpoint)
4. El worker marca el job como running → ejecuta → completed/failed
```

**Ventajas:** Manejo de reintentos y scheduling nativo. Sin polling. Escala automáticamente.
**Desventajas:** Requiere Google Cloud Tasks (fuera de Vercel).

### Opción C: Workers híbridos (recomendado)

```
1. Creación de job → status = "pending"
2. El mismo request que crea el job puede ejecutarlo inline si es simple
3. Un cron job periódico procesa jobs pendientes (respaldo)
4. Cloud Tasks o PubSub para jobs pesados (whatsapp masivo, emails)
```

### Procesamiento de jobs por tipo

```typescript
const jobHandlers: Record<JobType, (job: Job) => Promise<Record<string, unknown>>> = {
  send_whatsapp: async (job) => {
    const { to, template, variables } = job.payload
    const result = await whatsappAPI.sendTemplate(to, template, variables)
    return { messageId: result.id }
  },
  send_email: async (job) => {
    // ...
  },
  add_tag: async (job) => {
    const { customerId, tag } = job.payload
    await updateCustomerTag(customerId, tag)
    return { success: true }
  },
  // ...
}
```

---

## 9. Recomendaciones

### Inmediatas (ahora)

1. **Crear el archivo `lib/types.ts`** con todas las interfaces compartidas (ya está hecho).
2. **Migrar los tipos inline de las páginas** a importar desde `lib/types.ts`.
3. **Agregar `firestore.indexes.json`** con los índices compuestos listados arriba.
4. **Migrar los campos de `clientes/` a `customers/`** (o mantener ambos con un adaptador temporal).
5. **Actualizar `firestore.rules`** para cubrir las nuevas colecciones (`jobs`, `automations`, `events`).
6. **Implementar job processing vía API route** como MVP.

### Corto plazo (1–2 sprints)

7. **Implementar el sistema de eventos** — cada mutación importante (`createCustomer`, `completeSale`) emite un evento en la colección `/events/`.
8. **Crear la UI de automatizaciones** — panel drag & drop estilo n8n/Zapier para definir triggers y acciones.
9. **Implementar workers de WhatsApp y Email** usando la API route de jobs.
10. **Agregar tests unitarios** para el pipeline de eventos → condiciones → jobs.

### Mediano plazo (3–4 sprints)

11. **Migrar los workers a Cloud Tasks** para mejor scheduling y reintentos.
12. **Implementar agregaciones** — job de "daily summary" que precalcula métricas.
13. **Añadir rate limiting por grupo** (WhatsApp: ~15 msg/min por negocio).
14. **Implementar TTL** en eventos y jobs completados (borrar después de 90 días).

---

## 10. Errores de Diseño a Evitar

| # | Error | Consecuencia | Solución |
|---|-------|-------------|----------|
| 1 | **No usar transacciones** al crear ventas + actualizar inventario + actualizar customer metrics | Inconsistencia de datos si falla un paso | Usar `runTransaction` de Firestore en operaciones que afectan múltiples documentos. |
| 2 | **Anidar subcolecciones profundamente** (ej: `/companies/{id}/customers/{id}/sales/{id}`) | Las reglas de seguridad se complican. Las queries son más lentas. Las migraciones son dolorosas. | Máximo 2 niveles de anidación. Usar colecciones raíz de subcolección con `companyId` como filtro. |
| 3 | **Escuchar con `onSnapshot` toda la colección `jobs`** | Costos exponenciales. Cada listener paga 1 read por cada documento existente. | Solo escuchar queries muy específicas (`status = "running" AND companyId = X`). Para dashboards, usar datos precalculados. |
| 4 | **No limpiar jobs completados** | La colección `jobs` crece indefinidamente → queries lentas, reglas de seguridad más costosas, índices más grandes. | TTL: borrar jobs completados después de 7–30 días. Archivar en BigQuery si se necesita retención. |
| 5 | **Usar Firestore como scheduler de precisión** | Firestore no garantiza ejecución exacta en el segundo. Los jobs programados pueden ejecutarse con minutos de retraso. | Aceptar latencia de minutos. Para precisión de segundos, usar Cloud Tasks o cron externo. |
| 6 | **Modelar `automationState` como documento separado** | Complejidad innecesaria. Por cada cliente, habría que leer dos documentos. | Guardar el estado directamente en el cliente (`customer.automationState`) o en el job (`job.result`). |
| 7 | **No versionar el `payload` de los jobs** | Si cambia el schema del payload, los jobs en cola con schema viejo rompen. | Campo `version` en cada job. Los workers switchean según la versión. |
| 8 | **Índices innecesarios** | Cada índice adicional ralentiza las escrituras (1–2 ms extra por índice por escritura, multiplicado por miles de documentos). | Solo crear índices que las queries realmente usan. Monitorear con `EXPLAIN` en Firebase Console. |
| 9 | **No considerar el límite de 1 MiB por documento** | Un customer con muchos `customFields` o una venta con 50+ `items` puede excederlo. | Limitar arrays a tamaño razonable. Validar en backend antes de escribir. |
| 10 | **Reintentos sin backoff** | Si un job falla por un error transitorio (rate limiting de WhatsApp), reintentar inmediatamente empeora el problema. | Usar exponential backoff con jitter. Implementar circuit breaker por grupo (`group` field). |

---

## 11. Versión Recomendada para Producción

### Stack final recomendado

```
Frontend:     Next.js 16 + React 19 + Tailwind + shadcn/ui
Backend:      Next.js API Routes (inicial) → Cloud Tasks + Cloud Functions (escala)
Base datos:   Cloud Firestore (operacional) + BigQuery (analítico)
Auth:         Firebase Auth + JWT cookies
Workers:      Google Cloud Tasks + Cloud Functions (2nd gen)
Queue:        Firestore jobs (inicial) → Cloud Tasks (producción)
Scheduler:    Vercel Cron Jobs + Firestore queries
Monitoring:   Sentry (errores) + Firebase Performance + Cloud Monitoring
```

### Checklist para producción

- [ ] `lib/types.ts` creado y exportando todas las interfaces
- [ ] `firestore.indexes.json` actualizado con índices compuestos
- [ ] `firestore.rules` actualizado para cubrir `jobs`, `automations`, `events`
- [ ] Funciones helper para crear jobs: `createJob(data)` con validación
- [ ] Worker API route: `POST /api/jobs/process`
- [ ] Cron job configurado para ejecutar el worker cada 30s–1min
- [ ] Sistema de eventos implementado en todas las mutaciones
- [ ] Tests: pipeline evento → trigger → acción → job
- [ ] Tests: reintentos con backoff
- [ ] Tests: idempotencia de jobs (mismo job ejecutado dos veces no debe duplicar acciones)
- [ ] Rate limiting por grupo (WhatsApp, Email) con documentación de límites por API
- [ ] Monitoreo de jobs fallidos con alertas
- [ ] UI de administración de jobs (ver cola, cancelar, reintentar)
- [ ] TTL/limpieza automática de jobs completados

### Costos estimados (Firestore, 1.000 empresas)

| Concepto | Lecturas/día | Escrituras/día | Costo/mes (aprox) |
|----------|-------------|---------------|-------------------|
| Clientes (10 reads/cliente/mes) | 33K | 3K | $0.10 |
| Ventas (5 reads/venta) | 16K | 5K | $0.06 |
| Jobs (2 reads + 1 write/job) | 20K | 10K | $0.08 |
| Automations (cached) | 1K | 0.5K | $0.01 |
| Events (write-heavy) | 1K | 20K | $0.06 |
| **Total estimado** | **~71K** | **~38K** | **~$0.31/mes** |

> *Nota: Estos costos son para Firestore exclusivamente. Los workers (Cloud Functions/API Routes), Cloud Tasks y BigQuery tienen costos adicionales pero generalmente bajos para este volumen.*

---

*Documento generado el 22 de junio de 2026. Arquitectura diseñada para Novent — SaaS multiempresa para pequeños negocios.*
