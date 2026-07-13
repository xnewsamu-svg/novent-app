import {
  doc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export type CitaStatus = "pendiente" | "confirmada" | "en_progreso" | "completada" | "cancelada"

export interface CitaRecord {
  id?: string
  pacienteId: string | null
  pacienteNombre: string
  pacienteTelefono: string
  fecha: string
  hora: string
  duracion: number
  estado: CitaStatus
  notas: string
  precio: number
  companyId: string
  createdAt: Date
}

const collectionPath = (companyId: string) =>
  collection(db, "companies", companyId, "citas")

export const citasService = {
  async getAll(companyId: string): Promise<CitaRecord[]> {
    const snap = await getDocs(collectionPath(companyId))
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CitaRecord[]
    list.sort((a, b) => {
      const c = b.fecha.localeCompare(a.fecha)
      if (c !== 0) return c
      return b.hora.localeCompare(a.hora)
    })
    return list
  },

  async getByDate(companyId: string, date: string): Promise<CitaRecord[]> {
    const q = query(
      collectionPath(companyId),
      where("fecha", "==", date),
    )
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CitaRecord[]
    list.sort((a, b) => a.hora.localeCompare(b.hora))
    return list
  },

  async getByDateRange(companyId: string, startDate: string, endDate: string): Promise<CitaRecord[]> {
    const q = query(
      collectionPath(companyId),
      where("fecha", ">=", startDate),
      where("fecha", "<=", endDate),
    )
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CitaRecord[]
    list.sort((a, b) => {
      const c = a.fecha.localeCompare(b.fecha)
      if (c !== 0) return c
      return a.hora.localeCompare(b.hora)
    })
    return list
  },

  async create(
    companyId: string,
    data: Partial<CitaRecord>,
  ): Promise<string> {
    const ref = await addDoc(collectionPath(companyId), {
      pacienteId: data.pacienteId ?? null,
      pacienteNombre: data.pacienteNombre ?? "",
      pacienteTelefono: data.pacienteTelefono ?? "",
      fecha: data.fecha ?? "",
      hora: data.hora ?? "00:00",
      duracion: data.duracion ?? 30,
      estado: data.estado ?? "pendiente",
      notas: data.notas ?? "",
      precio: data.precio ?? 0,
      companyId,
      createdAt: new Date(),
    })
    return ref.id
  },

  async update(
    companyId: string,
    citaId: string,
    data: Partial<CitaRecord>,
  ): Promise<void> {
    const ref = doc(db, "companies", companyId, "citas", citaId)
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) clean[k] = v
    }
    await updateDoc(ref, clean)
  },

  async delete(companyId: string, citaId: string): Promise<void> {
    const ref = doc(db, "companies", companyId, "citas", citaId)
    await deleteDoc(ref)
  },
}
