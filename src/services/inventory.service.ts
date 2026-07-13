import {
  doc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, DocumentSnapshot, DocumentData, QueryConstraint,
  orderBy, limit, where, startAfter,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface ProductRecord {
  id?: string
  nombre: string
  categoria: string
  precio: number
  costo: number
  stock: number
  stockMinimo: number
}

const collectionPath = (companyId: string) =>
  collection(db, "companies", companyId, "inventario")

export const inventoryService = {
  subscribeAll(
    companyId: string,
    onData: (items: ProductRecord[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    getDocs(collectionPath(companyId))
      .then((snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ProductRecord[]
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  async getPaginated(
    companyId: string,
    options: {
      search?: string
      pageSize?: number
      startAfter?: DocumentSnapshot<DocumentData>
    } = {},
  ): Promise<{
    items: ProductRecord[]
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
    })) as ProductRecord[]
    const lastDoc = snap.docs.length > 0 ? snap.docs[Math.min(pageSize, snap.docs.length) - 1] : null

    return { items, lastDoc, hasMore }
  },

  async getAll(companyId: string): Promise<ProductRecord[]> {
    const snap = await getDocs(collectionPath(companyId))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductRecord[]
  },

  async create(
    companyId: string,
    data: Partial<ProductRecord>,
  ): Promise<string> {
    const ref = await addDoc(collectionPath(companyId), {
      nombre: data.nombre ?? "",
      categoria: data.categoria ?? "",
      precio: data.precio ?? 0,
      costo: data.costo ?? 0,
      stock: data.stock ?? 0,
      stockMinimo: data.stockMinimo ?? 3,
      companyId,
    })
    return ref.id
  },

  async update(
    companyId: string,
    productId: string,
    data: Partial<ProductRecord>,
  ): Promise<void> {
    const ref = doc(db, "companies", companyId, "inventario", productId)
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) clean[k] = v
    }
    await updateDoc(ref, clean)
  },

  async delete(companyId: string, productId: string): Promise<void> {
    const ref = doc(db, "companies", companyId, "inventario", productId)
    await deleteDoc(ref)
  },
}
