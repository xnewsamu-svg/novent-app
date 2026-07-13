import {
  doc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, DocumentSnapshot, DocumentData, QueryConstraint,
  orderBy, limit, where, startAfter,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface ServicioRecord {
  id?: string
  nombre: string
  precio: number
  descripcion: string
  duracion: number
  categoria: string
  active: boolean
}

const collectionPath = (companyId: string) =>
  collection(db, "companies", companyId, "servicios")

export const serviciosService = {
  async getAll(companyId: string): Promise<ServicioRecord[]> {
    const snap = await getDocs(collectionPath(companyId))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ServicioRecord[]
  },

  async create(
    companyId: string,
    data: Partial<ServicioRecord>,
  ): Promise<string> {
    const ref = await addDoc(collectionPath(companyId), {
      nombre: data.nombre ?? "",
      precio: data.precio ?? 0,
      descripcion: data.descripcion ?? "",
      duracion: data.duracion ?? 30,
      categoria: data.categoria ?? "",
      active: data.active ?? true,
      companyId,
    })
    return ref.id
  },

  async update(
    companyId: string,
    servicioId: string,
    data: Partial<ServicioRecord>,
  ): Promise<void> {
    const ref = doc(db, "companies", companyId, "servicios", servicioId)
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) clean[k] = v
    }
    await updateDoc(ref, clean)
  },

  async delete(companyId: string, servicioId: string): Promise<void> {
    const ref = doc(db, "companies", companyId, "servicios", servicioId)
    await deleteDoc(ref)
  },
}
