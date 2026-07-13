# Setup Externo — Novent App

## 1. Firebase Admin SDK (Service Account)

**Requisito:** API routes (webhooks, jobs, cron, DLQ) usan Admin SDK para operaciones server-side.

### Pasos

1. Ir a [Firebase Console](https://console.firebase.google.com) → Proyecto → ⚙️ Configuración del proyecto → **Cuentas de servicio**
2. Click **"Generar nueva clave privada"** → se descarga un archivo `.json`
3. Copiar TODO el contenido del JSON
4. Escapar el JSON como string de una línea (online tools como [jsonescape.com](https://www.jsonescape.com/))
5. Pegar en `.env.local`:

```
FIREBASE_ADMIN_KEY={"type":"service_account","project_id":"..."}
```

> **⚠️** Debe ser el JSON completo escapado, NO el path al archivo. Si falla, el error será `FIREBASE_ADMIN_KEY environment variable is not set` en cualquier API route.

---

## 2. Meta WhatsApp Cloud API

**Requisito:** Envío real de mensajes vía WhatsApp Business Platform (Cloud API v21.0).

### Pasos

#### 2.1 Crear App en Meta Developer

1. Ir a [developers.facebook.com](https://developers.facebook.com/)
2. **"Mis Apps"** → **"Crear app"**
3. Tipo: **"Empresa"** (Business)
4. Nombre: ej. "Novent WhatsApp"
5. Agregar producto: **"WhatsApp"**

#### 2.2 Configurar WhatsApp Business

1. En la app → Productos → **WhatsApp** → **"Configurar"**
2. **"Empezar"** → Crear o conectar un Business Portfolio
3. Una vez conectado, verás:
   - **"Número de teléfono"** — ID numérico (Phone Number ID)
   - **"Token de acceso"** — Generar token permanente

#### 2.3 Generar Token Permanente

1. En WhatsApp → Configuración de API → **"Generar token"**
2. Seleccionar el número de teléfono
3. Elegir **"Permanente"** (no temporal de 24h)
4. Copiar el token

#### 2.4 Configurar `.env.local`

```
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAATokenLargo...
WHATSAPP_VERIFY_TOKEN=novent_webhook_2024
```

> `WHATSAPP_VERIFY_TOKEN` es un string **tú eliges**. Debe ser el MISMO en `.env.local` y en el paso 2.5.

#### 2.5 Configurar Webhook en Meta

1. WhatsApp → **"Configuración de webhooks"**
2. Click **"Editar suscripción"**
3. Ingresar:
   - **Callback URL:** `https://tudominio.com/api/webhooks/whatsapp`
   - **Verify token:** `novent_webhook_2024` (mismo que en `.env.local`)
4. Suscribirse a eventos:
   - ✅ `messages` (recibir mensajes entrantes)
   - ✅ `message_deliveries` (confirmaciones de entrega)
   - ✅ `message_reads` (confirmaciones de lectura)

#### 2.6 Verificar Número

WhatsApp Business requiere que el número esté verificado. En la consola de Meta:
- WhatsApp → **"Administrar números de teléfono"**
- Agregar número → Recibirás SMS/código de verificación

---

## 3. Cron Scheduler

**Requisito:** Jobs en Firestore (pending/running/failed) nunca se procesan automáticamente sin un trigger externo.

### Opción A: cron-job.org (gratis)

1. Ir a [cron-job.org](https://cron-job.org/)
2. Registrarse → **"Crear cronjob"**
3. Configurar:
   - **URL:** `https://tudominio.com/api/cron/process-jobs`
   - **Intervalo:** Every 1 minute
   - **Method:** GET

### Opción B: Vercel Pro Cron Jobs

1. En `vercel.json` del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "* * * * *"
    }
  ]
}
```

2. Hacer deploy → Vercel ejecuta `GET /api/cron/process-jobs` cada minuto

### Opción C: GitHub Actions

```yaml
name: Process Jobs
on:
  schedule:
    - cron: '* * * * *'
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X GET https://tudominio.com/api/cron/process-jobs
```

---

## 4. Deploy Firestore Rules e Indexes

**Requisito:** Las reglas de seguridad e índices compuestos deben desplegarse antes de usar automations, jobs, etc.

### Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init firestore  # si no existe firebase.json
```

### Desplegar

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

> Verificar que `firebase.json` apunte a `firestore.rules` y `firestore.indexes.json` correctamente.

---

## 5. Integración del Dashboard

**El componente `WhatsAppMetrics`** ya está en el dashboard. Mostrará datos reales solo cuando existan documentos en `companies/{id}/messages` (creados automáticamente al enviar WhatsApp vía `send_whatsapp` action).

---

## Resumen de Variables de Entorno

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Configuración del proyecto → SDK |
| `FIREBASE_ADMIN_KEY` | Firebase Console → Cuentas de servicio → Generar clave |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developer Console → WhatsApp → Número |
| `WHATSAPP_ACCESS_TOKEN` | Meta Developer Console → WhatsApp → Token permanente |
| `WHATSAPP_VERIFY_TOKEN` | Tú eliges (string cualquiera, ej. `novent_webhook_2024`) |

## Diagrama de Flujo

```
[Cliente escribe] → [Webhook POST /api/webhooks/whatsapp]
                         ↓
               evaluateAutomationEvent("whatsapp.message.received")
                         ↓
               engine.js crea Job (status: "pending")
                         ↓
               [Cron cada 1min → GET /api/cron/process-jobs]
                         ↓
               POST /api/jobs/process (procesa jobs)
                         ↓
               executeAction("send_whatsapp", context)
                         ↓
               WhatsAppClient.sendMessage()
                         ↓
               [Meta Cloud API] → [Cliente recibe mensaje]
```
