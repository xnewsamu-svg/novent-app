import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, Timestamp } from "firebase-admin/firestore"

const key = process.env.FIREBASE_ADMIN_KEY
if (!key) {
  console.error("FIREBASE_ADMIN_KEY no configurada")
  process.exit(1)
}

const companyId = process.env.COMPANY_ID
if (!companyId) {
  console.error("COMPANY_ID no configurada. Usar: COMPANY_ID=xxx node scripts/seed-test-workflow.mjs")
  process.exit(1)
}

const apps = getApps()
const app = apps.length > 0 ? apps[0] : initializeApp({ credential: cert(JSON.parse(key)) })
const db = getFirestore(app)

async function seed() {
  const now = Timestamp.now()

  // 1. Crear workflow draft
  const workflowRef = db
    .collection("companies")
    .doc(companyId)
    .collection("workflows")

  const draftRef = await workflowRef.add({
    companyId,
    name: "WhatsApp Auto Reply (Test)",
    description: "Workflow de prueba: responde automáticamente a mensajes de WhatsApp",
    enabled: false,
    version: 0,
    publishedAt: null,
    trigger: { eventType: "whatsapp.message.received" },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 0, y: 0 },
        config: { eventType: "whatsapp.message.received" },
      },
      {
        id: "action-1",
        type: "action.whatsapp.send",
        position: { x: 200, y: 0 },
        config: { actionType: "action.whatsapp.send" },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 400, y: 0 },
        config: {},
      },
    ],
    edges: [
      { id: "edge-1", from: "trigger-1", to: "action-1", label: null, branch: null },
      { id: "edge-2", from: "action-1", to: "end-1", label: null, branch: null },
    ],
    createdAt: now,
    updatedAt: now,
  })

  console.log("Workflow draft creado:", draftRef.id)

  // 2. Publicar workflow (versión 1)
  const version = 1
  const versionRef = workflowRef
    .doc(draftRef.id)
    .collection("versions")
    .doc(String(version))

  const snapshot = {
    id: draftRef.id,
    companyId,
    name: "WhatsApp Auto Reply (Test)",
    description: "Workflow de prueba: responde automáticamente a mensajes de WhatsApp",
    enabled: true,
    version,
    publishedAt: new Date(),
    trigger: { eventType: "whatsapp.message.received" },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 0, y: 0 },
        config: { eventType: "whatsapp.message.received" },
      },
      {
        id: "action-1",
        type: "action.whatsapp.send",
        position: { x: 200, y: 0 },
        config: { actionType: "action.whatsapp.send" },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 400, y: 0 },
        config: {},
      },
    ],
    edges: [
      { id: "edge-1", from: "trigger-1", to: "action-1", label: null, branch: null },
      { id: "edge-2", from: "action-1", to: "end-1", label: null, branch: null },
    ],
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  }

  await versionRef.set(snapshot)
  console.log("Workflow version", version, "publicada")

  // 3. Actualizar draft con versión publicada
  await workflowRef.doc(draftRef.id).update({
    version,
    publishedAt: now,
    enabled: true,
    updatedAt: now,
  })

  console.log("Workflow actualizado con versión", version)
  console.log("\nResumen:")
  console.log("  Workflow ID:", draftRef.id)
  console.log("  Company ID:", companyId)
  console.log("  Trigger:", "whatsapp.message.received")
  console.log("  Nodos:", 3)
  console.log("  Versión:", version)
}

seed()
  .then(() => {
    console.log("\nSeed completado exitosamente")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Error en seed:", err)
    process.exit(1)
  })
