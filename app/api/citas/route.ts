import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const body = await req.json()

    const {
      pacienteNombre,
      pacienteTelefono,
      fecha,
      hora,
      duracion,
      estado,
      precio,
      notas,
      pacienteId,
    } = body

    // Create the cita
    const citaRef = await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("citas")
      .add({
        pacienteId: pacienteId ?? null,
        pacienteNombre: pacienteNombre ?? "",
        pacienteTelefono: pacienteTelefono ?? "",
        fecha: fecha ?? "",
        hora: hora ?? "00:00",
        duracion: duracion ?? 30,
        estado: estado ?? "pendiente",
        notas: notas ?? "",
        precio: precio ?? 0,
        companyId,
        createdAt: new Date(),
      })

    // Auto-create customer if phone is provided and doesn't exist
    if (pacienteTelefono) {
      const clientsRef = adminDb
        .collection("companies")
        .doc(companyId)
        .collection("clientes")

      const existing = await clientsRef
        .where("telefono", "==", pacienteTelefono)
        .limit(1)
        .get()

      if (existing.empty) {
        await clientsRef.add({
          nombre: pacienteNombre ?? "",
          telefono: pacienteTelefono,
          estado: "Activo",
          ultimaVisita: "Sin visitas",
          visitas: 0,
          totalGastado: 0,
          companyId,
        })
      }
    }

    return NextResponse.json({ id: citaRef.id })
  } catch (error) {
    return handleError(error)
  }
}
