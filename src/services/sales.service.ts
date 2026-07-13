import {
  doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, DocumentSnapshot, DocumentData, QueryConstraint,
  orderBy, where, runTransaction, increment, startAfter, limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface SaleRecord {
  id?: string
  cliente: string
  servicio: string
  precio: number
  fecha: string
  hora?: string
  productoId: string
  cantidad: number
}

const collectionPath = (companyId: string) =>
  collection(db, "companies", companyId, "ventas")

export const salesService = {
  subscribeAll(
    companyId: string,
    onData: (items: SaleRecord[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    getDocs(collectionPath(companyId))
      .then((snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SaleRecord[]
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  subscribeByCustomer(
    companyId: string,
    customerId: string,
    onData: (items: SaleRecord[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const q = query(
      collectionPath(companyId),
      where("cliente", "==", customerId),
      orderBy("fecha", "desc"),
    )
    getDocs(q)
      .then((snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SaleRecord[]
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  async getAll(companyId: string): Promise<SaleRecord[]> {
    const snap = await getDocs(collectionPath(companyId))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SaleRecord[]
  },

  async getByCustomer(companyId: string, customerId: string): Promise<SaleRecord[]> {
    const q = query(
      collectionPath(companyId),
      where("cliente", "==", customerId),
      orderBy("fecha", "desc"),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SaleRecord[]
  },

  async getPaginated(
    companyId: string,
    options: {
      pageSize?: number
      startAfter?: DocumentSnapshot<DocumentData>
    } = {},
  ): Promise<{
    items: SaleRecord[]
    lastDoc: DocumentSnapshot<DocumentData> | null
    hasMore: boolean
  }> {
    const pageSize = options.pageSize ?? 50
    const constraints: QueryConstraint[] = []

    constraints.push(orderBy("fecha", "desc"))
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
    })) as SaleRecord[]
    const lastDoc = snap.docs.length > 0 ? snap.docs[Math.min(pageSize, snap.docs.length) - 1] : null

    return { items, lastDoc, hasMore }
  },

  async createWithTransaction(
    companyId: string,
    data: {
      cliente: string
      clienteNombre?: string
      clienteTelefono?: string
      productoId: string
      cantidad: number
      nombreProducto: string
      precioProducto: number
    },
  ): Promise<{ saleId: string; newCustomerId?: string }> {
    const now = new Date()
    const fecha = now.toISOString().split("T")[0]
    const hora = now.toLocaleTimeString()
    const total = data.precioProducto * data.cantidad
    const ventaRef = doc(collection(db, "companies", companyId, "ventas"))
    let newCustomerId: string | undefined

    await runTransaction(db, async (transaction) => {
      const productRef = doc(db, "companies", companyId, "inventario", data.productoId)
      const clientRef = doc(db, "companies", companyId, "clientes", data.cliente)

      const productSnap = await transaction.get(productRef)
      if (!productSnap.exists()) throw new Error("Producto no encontrado")
      const stockActual = productSnap.data().stock || 0
      if (data.cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor a cero")
      }
      if (stockActual < data.cantidad) {
        throw new Error(`Stock insuficiente. Disponible: ${stockActual}`)
      }

      const clienteSnap = await transaction.get(clientRef)
      if (!clienteSnap.exists()) {
        if (data.clienteNombre) {
          const newClientRef = doc(collection(db, "companies", companyId, "clientes"))
          newCustomerId = newClientRef.id
          transaction.set(newClientRef, {
            nombre: data.clienteNombre,
            telefono: data.clienteTelefono ?? "",
            estado: "Activo",
            ultimaVisita: fecha,
            visitas: 1,
            totalGastado: total,
            companyId,
          })
          transaction.set(ventaRef, {
            cliente: newClientRef.id,
            servicio: data.nombreProducto,
            precio: total,
            fecha,
            hora,
            productoId: data.productoId,
            cantidad: data.cantidad,
          })
          transaction.update(productRef, { stock: increment(-data.cantidad) })
          return
        }
        throw new Error("Cliente no encontrado")
      }

      transaction.set(ventaRef, {
        cliente: data.cliente,
        servicio: data.nombreProducto,
        precio: total,
        fecha,
        hora,
        productoId: data.productoId,
        cantidad: data.cantidad,
      })

      transaction.update(productRef, { stock: increment(-data.cantidad) })
      transaction.update(clientRef, {
        ultimaVisita: fecha,
        estado: "Activo",
        visitas: increment(1),
        totalGastado: increment(total),
      })
    })

    return { saleId: ventaRef.id, newCustomerId }
  },

  async deleteWithTransaction(
    companyId: string,
    saleId: string,
  ): Promise<void> {
    const ventaRef = doc(db, "companies", companyId, "ventas", saleId)

    await runTransaction(db, async (transaction) => {
      const ventaSnap = await transaction.get(ventaRef)
      if (!ventaSnap.exists()) throw new Error("Venta no encontrada")
      const ventaData = ventaSnap.data()

      transaction.delete(ventaRef)

      if (ventaData.productoId) {
        const productRef = doc(db, "companies", companyId, "inventario", ventaData.productoId)
        const productSnap = await transaction.get(productRef)
        if (productSnap.exists()) {
          transaction.update(productRef, { stock: increment(ventaData.cantidad || 1) })
        }
      }

      if (ventaData.cliente) {
        const clienteRef = doc(db, "companies", companyId, "clientes", ventaData.cliente)
        const clienteSnap = await transaction.get(clienteRef)
        if (clienteSnap.exists()) {
          transaction.update(clienteRef, {
            totalGastado: increment(-(ventaData.precio || 0)),
            visitas: increment(-1),
          })
        }
      }
    })
  },
}
