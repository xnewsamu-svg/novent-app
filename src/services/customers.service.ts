import {
  doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, DocumentSnapshot, DocumentData, QueryConstraint,
  orderBy, limit, where, startAfter,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface CustomerRecord {
  id?: string
  nombre: string
  telefono: string
  estado?: string
  ultimaVisita?: string
  visitas?: number
  totalGastado?: number
}

export interface CustomerDetail {
  id?: string
  nombre: string
  telefono: string
  estado: string
  ultimaVisita: string
  visitas: number
  totalGastado: number
}

const collectionPath = (companyId: string) =>
  collection(db, "companies", companyId, "clientes")

export const customersService = {
  subscribeAll(
    companyId: string,
    onData: (items: CustomerRecord[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    getDocs(collectionPath(companyId))
      .then((snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CustomerRecord[]
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  async getById(companyId: string, customerId: string): Promise<CustomerDetail | null> {
    const ref = doc(db, "companies", companyId, "clientes", customerId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as CustomerDetail
  },

  async getPaginated(
    companyId: string,
    options: {
      search?: string
      pageSize?: number
      startAfter?: DocumentSnapshot<DocumentData>
    } = {},
  ): Promise<{
    items: CustomerRecord[]
    lastDoc: DocumentSnapshot<DocumentData> | null
    hasMore: boolean
  }> {
    const { search: searchText, pageSize = 50 } = options
    const constraints: QueryConstraint[] = []

    if (searchText) {
      constraints.push(
        where("nombre", ">=", searchText),
        where("nombre", "<=", searchText + "\uf8ff"),
      )
    }

    constraints.push(orderBy("nombre"))
    constraints.push(limit(pageSize + 1))

    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter))
    }

    const q = query(collectionPath(companyId), ...constraints)
    const snap = await getDocs(q)

    const hasMore = snap.docs.length > pageSize
    const items = snap.docs.slice(0, pageSize).map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CustomerRecord[]
    const lastDoc = snap.docs.length > 0 ? snap.docs[Math.min(pageSize, snap.docs.length) - 1] : null

    return { items, lastDoc, hasMore }
  },

  async getAll(companyId: string): Promise<CustomerRecord[]> {
    const snap = await getDocs(collectionPath(companyId))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CustomerRecord[]
  },

  async findByPhone(companyId: string, phone: string): Promise<CustomerRecord | null> {
    if (!phone) return null
    const q = query(
      collectionPath(companyId),
      where("telefono", "==", phone),
      limit(1),
    )
    const snap = await getDocs(q)
    if (snap.empty) return null
    const doc = snap.docs[0]
    return { id: doc.id, ...doc.data() } as CustomerRecord
  },

  async create(
    companyId: string,
    data: Partial<CustomerRecord>,
  ): Promise<string> {
    const ref = await addDoc(collectionPath(companyId), {
      nombre: data.nombre ?? "",
      telefono: data.telefono ?? "",
      estado: data.estado ?? "Activo",
      ultimaVisita: data.ultimaVisita ?? "Sin visitas",
      visitas: data.visitas ?? 0,
      totalGastado: data.totalGastado ?? 0,
      companyId,
    })
    return ref.id
  },

  async update(
    companyId: string,
    customerId: string,
    data: Partial<CustomerRecord>,
  ): Promise<void> {
    const ref = doc(db, "companies", companyId, "clientes", customerId)
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) clean[k] = v
    }
    await updateDoc(ref, clean)
  },

  async delete(companyId: string, customerId: string): Promise<void> {
    const ref = doc(db, "companies", companyId, "clientes", customerId)
    await deleteDoc(ref)
  },
}
