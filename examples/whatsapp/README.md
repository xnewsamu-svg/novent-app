# Payloads de prueba para Webhook de WhatsApp

## Uso con curl

```bash
# Prerequisito: Configurar tunnel público (ngrok)
ngrok http 3000

# Probar el challenge (GET)
curl "https://TU_NGROK.ngrok.dev/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=MI_TOKEN&hub.challenge=12345"

# Probar mensaje de texto (POST)
curl -X POST "https://TU_NGROK.ngrok.dev/api/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -d @01-text-message.json
```

## Archivos

| Archivo | Descripción |
|---|---|
| `01-text-message.json` | Mensaje de texto entrante de un cliente |
| `02-status-update.json` | Actualización de estado (delivered/read/sent) |
| `03-image-message.json` | Mensaje con imagen recibida |
| `04-empty-message.json` | Webhook sin mensajes (solo metadata) |
| `05-invalid-payload.json` | Payload inválido (no es de WhatsApp) |

## Challenge de Meta

Para probar la verificación del webhook, Meta envía un GET con los parámetros:
- `hub.mode` = "subscribe"
- `hub.verify_token` = el token configurado en `WHATSAPP_VERIFY_TOKEN`
- `hub.challenge` = string que debe devolverse exactamente

## Requisitos

Antes de probar, asegurar variables de entorno:
- `WHATSAPP_VERIFY_TOKEN` — Token para verificación del webhook
- `WHATSAPP_WEBHOOK_SECRET` — (opcional) Secreto para HMAC
- `FIREBASE_ADMIN_KEY` — Credenciales de Firebase Admin

Reemplazar `PHONE_NUMBER_ID` y `WHATSAPP_BUSINESS_ACCOUNT_ID` con valores reales.
