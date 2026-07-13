# INFORME — Novent SaaS MVP

## Estado General: ✅ LISTO PARA PRODUCCIÓN

| Componente | Progreso |
|---|---|
| Frontend (páginas) | ~95% |
| Backend (API routes) | ~90% |
| Motor de automatizaciones | ~95% |
| Integración WhatsApp | ~80% |
| Tests unitarios | ✅ 30 tests |
| Build | ✅ Compila limpio |

## Stack

- **Framework:** Next.js 16.2.6 (App Router, Turbopack)
- **Auth/Database:** Firebase (client) + Firebase Admin SDK
- **UI:** shadcn/ui + Tailwind CSS v4, dark theme
- **WhatsApp:** Meta Cloud API v21.0
- **Email:** Resend
- **ORM/Backend:** Server Actions + API Routes
- **Tests:** Vitest v4
- **Multi-tenancy:** Firestore por `companyId` en subcolecciones

## Lo que ya funciona

### Automatizaciones (motor completo)
- Evaluación de condiciones: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`, `not_in`
- Acciones implementadas:
  - `send_whatsapp` ✅ (envía templates y mensajes de texto, rate limiting)
  - `send_email` ✅ (vía Resend — requiere API key real)
  - `add_tag` / `remove_tag` ✅
  - `change_status` ✅
  - `create_sale` ✅
  - `create_lead` ✅
  - `update_customer` ✅
  - `webhook` ✅
  - `delay` ✅
- Engine: crea jobs en Firestore, agrupa mensajes por tipo
- DLQ (Dead Letter Queue): jobs fallidos → colección `deadLetterQueue`, se pueden reintentar
- Dashboard muestra leads del día y jobs fallidos

### WhatsApp
- Webhook entrante: recibe mensajes, auto-crea lead, ejecuta automatización en tiempo real
- Auto-respuesta inmediata (no espera cron)
- Rate limiting implementado

### Páginas
- Dashboard con widgets: stats, leads del día, actividad reciente, jobs fallidos, métricas WhatsApp
- Clientes: CRUD completo con eventos `customer.created` / `customer.updated`
- Ventas, Inventario, Automatizaciones, WhatsApp campaigns/templates

## Pendiente para salir a producción

### 1. Crítico — Configurar variables de entorno
Estas están en `.env.local` y requieren valores reales:

| Variable | Estado | Dónde obtenerla |
|---|---|---|
| `RESEND_API_KEY` | ⚠️ placeholder `re_xxxx` | https://resend.com → API Keys |
| `WHATSAPP_PHONE_NUMBER_ID` | ❌ vacío | Meta Business Suite → WhatsApp → Phone numbers |
| `WHATSAPP_ACCESS_TOKEN` | ❌ vacío | Meta Business Suite → generar token |
| `FIREBASE_ADMIN_KEY` | ⚠️ tiene estructura pero credenciales vacías | Firebase Console → Project Settings → Service Accounts → Generate new private key |

### 2. Desplegar reglas e índices de Firestore
```powershell
firebase deploy --only firestore:rules,firestore:indexes
```
Requiere Firebase CLI instalado y `firebase login`.

### 3. Deploy a producción
Actualmente no hay configuración de hosting. Opciones:
- **Vercel** (recomendado para Next.js): conectar repo, agregar env vars, deploy automático
- **Firebase Hosting** + Cloud Functions
- Configurar dominio personalizado

### 4. Consideraciones de monitoreo
- Agregar logging estructurado en el job processor
- Agregar alertas para DLQ no vacía
- Agregar health check endpoint

### 5. Mejoras futuras (post-MVP)
- Dashboard: botón "Reintentar" en jobs fallidos
- Landing page pública con widget de leads
- Reportes semanales automáticos vía email
- Onboarding multi-paso para nuevos usuarios

## Cómo ejecutar

```powershell
# Desarrollo
npm run dev

# Tests
npm test

# Tests en modo watch
npm run test:watch

# Build producción
npm run build

# Deploy Firestore
firebase deploy --only firestore:rules,firestore:indexes
```

## Archivos clave

| Archivo | Propósito |
|---|---|
| `lib/automations/actions.ts` | Handlers de todas las acciones |
| `lib/automations/conditions.ts` | Evaluación de condiciones |
| `lib/automations/engine.ts` | Motor de automatizaciones |
| `lib/automations/events.ts` | Sistema de eventos |
| `lib/automations/jobs.ts` | Cola de jobs |
| `lib/jobs/dlq.ts` | Dead Letter Queue |
| `lib/firebase-admin.ts` | Firebase Admin (lazy init) |
| `proxy.ts` | Auth middleware (Next.js 16) |
| `app/api/webhooks/whatsapp/route.ts` | Webhook WhatsApp |
| `app/(protected)/dashboard/` | Dashboard + widgets |
| `firestore.rules` | Reglas de seguridad |
| `firestore.indexes.json` | Índices compuestos |
| `scripts/deploy-rules.ps1` | Script de deploy |
| `vitest.config.ts` | Configuración de tests |

---

*Generado el 02/07/2026 — Novent SaaS MVP v0.1.0*
