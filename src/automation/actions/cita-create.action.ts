import { adminDb } from "@/lib/firebase-admin"
import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"
import { logger } from "@/src/lib/logger"

const citaCreateAction: ActionExecutor = {
  type: "action.cita.create",
  label: "Crear Cita",
  description: "Crea una nueva cita en el calendario y opcionalmente un cliente",

  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const companyId = (context.eventPayload?.companyId ??
        config.companyId) as string | undefined
      if (!companyId) {
        return {
          success: false,
          output: null,
          error: "cita.create: companyId no encontrado",
          retryable: false,
        }
      }

      const now = new Date()
      const today = now.toISOString().split("T")[0]

      const pacienteNombre = (config.pacienteNombre as string) ??
        (context.eventPayload?.customerName as string) ??
        (context.eventPayload?.name as string) ??
        (context.eventPayload?.pushName as string) ??
        "Sin nombre"

      const pacienteTelefono = (config.pacienteTelefono as string) ??
        (context.eventPayload?.customerPhone as string) ??
        (context.eventPayload?.phone as string) ??
        (context.eventPayload?.from as string) ??
        ""

      const fecha = (config.fecha as string) ?? today
      const hora = (config.hora as string) ??
        `${String(now.getHours()).padStart(2, "0")}:${String((now.getMinutes() + 30) % 60).padStart(2, "0")}`

      logger.info("cita.create: ejecutando", {
        companyId,
        pacienteNombre,
        pacienteTelefono,
        fecha,
        hora,
      })

      if (pacienteTelefono) {
        const cincoMinutosAtras = new Date(now.getTime() - 5 * 60 * 1000)
        const dupSnap = await adminDb
          .collection("companies")
          .doc(companyId)
          .collection("citas")
          .where("pacienteTelefono", "==", pacienteTelefono)
          .where("createdAt", ">=", cincoMinutosAtras)
          .limit(1)
          .get()

        if (!dupSnap.empty) {
          const existing = dupSnap.docs[0]
          logger.info("cita.create: duplicado detectado (mismo teléfono en últimos 5 min), saltando", {
            companyId,
            citaExistenteId: existing.id,
            pacienteTelefono,
          })
          return {
            success: true,
            output: { citaId: existing.id, skipped: true },
            error: null,
            retryable: false,
          }
        }
      }

      let pacienteId: string | null = null

      if (pacienteTelefono) {
        const existingSnap = await adminDb
          .collection("companies")
          .doc(companyId)
          .collection("clientes")
          .where("phone", "==", pacienteTelefono)
          .limit(1)
          .get()

        if (!existingSnap.empty) {
          pacienteId = existingSnap.docs[0].id
          logger.info("cita.create: cliente existente encontrado", {
            companyId,
            pacienteId,
            pacienteTelefono,
          })
        } else {
          const customerRef = await adminDb
            .collection("companies")
            .doc(companyId)
            .collection("clientes")
            .add({
              name: pacienteNombre,
              phone: pacienteTelefono,
              email: null,
              status: "active",
              source: "whatsapp",
              totalSpent: 0,
              visitCount: 0,
              averageTicket: 0,
              lifetimeValue: 0,
              notes: "Creado automáticamente desde WhatsApp",
              companyId,
              createdAt: now,
              updatedAt: now,
            })
          pacienteId = customerRef.id
          logger.info("cita.create: cliente creado", {
            companyId,
            pacienteId,
            pacienteTelefono,
          })
        }
      }

      const citaData = {
        pacienteId,
        pacienteNombre,
        pacienteTelefono,
        fecha,
        hora,
        duracion: (config.duracion as number) ?? 30,
        estado: "pendiente",
        notas: (config.notas as string) ?? "Cita creada automáticamente",
        precio: (config.precio as number) ?? 0,
        companyId,
        createdAt: now,
      }

      const citaRef = await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("citas")
        .add(citaData)

      logger.info("cita.create: cita creada", {
        companyId,
        citaId: citaRef.id,
        pacienteId,
        fecha,
        hora,
      })

      return {
        success: true,
        output: {
          citaId: citaRef.id,
          pacienteId,
          pacienteNombre,
          fecha,
          hora,
        },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      logger.error("cita.create: error", { companyId: context.eventPayload?.companyId as string }, error)
      return {
        success: false,
        output: null,
        error: `cita.create: ${message}`,
        retryable: true,
      }
    }
  },
}

actionRegistry.register(citaCreateAction)

export default citaCreateAction
