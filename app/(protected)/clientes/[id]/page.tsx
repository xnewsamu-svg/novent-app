"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { useCustomers } from "@/src/hooks/useCustomers"
import { useSales } from "@/src/hooks/useSales"

// =========================
// TYPES
// =========================

type Cliente = {
  id?: string
  nombre: string
  telefono: string
  estado: string
  ultimaVisita: string
  visitas: number
  totalGastado: number
}

type Venta = {
  id?: string
  cliente: string
  servicio: string
  precio: number
  fecha: string
}

// =========================
// PAGE
// =========================

export default function ClienteDetailPage() {

  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { fetchById } = useCustomers(companyId, false)
  const { sales: ventas } = useSales(companyId, id)

  // =========================
  // AUTH
  // =========================

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user || !id) return
      const userData = await getUserCompany(user.uid)
      if (!userData) return
      setCompanyId(userData.companyId)
    })
    return () => unsubAuth()
  }, [id])

  // =========================
  // CLIENTE
  // =========================

  useEffect(() => {
    if (!companyId || !id) return
    fetchById(id).then((data) => {
      if (data) setCliente(data as Cliente)
      setLoading(false)
    })
  }, [companyId, id, fetchById])

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (
      <div className="p-6 text-white">
        Cargando cliente...
      </div>
    )
  }

  // =========================
  // NOT FOUND
  // =========================

  if (!cliente) {

    return (
      <div className="p-6 text-white">
        Cliente no encontrado
      </div>
    )
  }

  // =========================
  // UI
  // =========================

  return (

    <div className="p-6 space-y-6 text-white">

      {/* HEADER */}

      <div>

        <h1 className="text-4xl font-bold">
          {cliente.nombre}
        </h1>

        <p className="text-zinc-400">
          {cliente.telefono}
        </p>

      </div>

      {/* STATS */}

      <div className="grid md:grid-cols-3 gap-4">

        <div className="bg-green-500 text-black p-5 rounded-2xl">

          <p>Total Gastado</p>

          <p className="text-2xl font-bold">
            ${cliente.totalGastado || 0}
          </p>

        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">

          <p>Visitas</p>

          <p className="text-2xl font-bold">
            {cliente.visitas || 0}
          </p>

        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">

          <p>Última visita</p>

          <p className="text-2xl font-bold">
            {cliente.ultimaVisita}
          </p>

        </div>

      </div>

      {/* HISTORIAL */}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

        <div className="p-4 border-b border-zinc-800">

          <h2 className="font-bold">
            Historial de ventas
          </h2>

        </div>

        <table className="w-full">

          <thead className="text-zinc-400 border-b border-zinc-800">

            <tr>

              <th className="p-4 text-left">
                Servicio
              </th>

              <th className="p-4 text-left">
                Precio
              </th>

              <th className="p-4 text-left">
                Fecha
              </th>

            </tr>

          </thead>

          <tbody>

            {ventas.length === 0 && (

              <tr>

                <td
                  colSpan={3}
                  className="p-4 text-zinc-500"
                >
                  Sin ventas aún
                </td>

              </tr>
            )}

            {ventas.map((venta) => (

              <tr
                key={venta.id}
                className="border-b border-zinc-800"
              >

                <td className="p-4">
                  {venta.servicio}
                </td>

                <td className="p-4">
                  ${venta.precio}
                </td>

                <td className="p-4 text-zinc-400">
                  {venta.fecha}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}
