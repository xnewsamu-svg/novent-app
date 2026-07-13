"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { emitEvent } from "@/lib/automations/events"
import { toast } from "sonner"
import {
  Users, Crown, Search, Pencil, Trash2,
  UserPlus, Phone, Eye, Loader2,
} from "lucide-react"
import { useCustomers } from "@/src/hooks/useCustomers"
import type { CustomerRecord } from "@/src/services/customers.service"

type Cliente = CustomerRecord

export default function ClientesPage() {

  const [companyId, setCompanyId] =
    useState<string | null>(null)

  const [nombre, setNombre] =
    useState("")

  const [telefono, setTelefono] =
    useState("")

  const [searchInput, setSearchInput] =
    useState("")

  const [editingId, setEditingId] =
    useState<string | null>(null)

  const [saving, setSaving] =
    useState(false)

  const {
    customers,
    loading,
    create,
    update,
    remove,
    hasMore,
    loadMore,
    setSearch,
  } = useCustomers(companyId, true, { pageSize: 50 })

  const showLoading =
    !companyId ? false : loading

  // =========================
  // AUTH
  // =========================

  useEffect(() => {

    const unsub =
      onAuthStateChanged(
        auth,
        async (user) => {

          try {

            if (!user) {
              return
            }

            let userData: Awaited<ReturnType<typeof getUserCompany>> = null
            try {
              userData = await getUserCompany(user.uid)
            } catch {
              return
            }

            if (!userData) {
              return
            }

            setCompanyId(userData.companyId)

          } catch (err) {

            console.error(err)
          }
        }
      )

    return () => unsub()

  }, [])



  // =========================
  // SEARCH DEBOUNCE
  // =========================

  useEffect(() => {

    const timer =
      setTimeout(
        () => setSearch(searchInput),
        300
      )

    return () => clearTimeout(timer)

  }, [searchInput, setSearch])

  // =========================
  // SAVE
  // =========================

  const handleSave = async () => {

    if (!nombre || !telefono)
      return

    if (!companyId)
      return

    setSaving(true)

    try {

      if (editingId) {

        await update(editingId, { nombre, telefono })

        setEditingId(null)

        toast.success(
          "Cliente actualizado"
        )

      } else {

        const newCustomerId =
          await create({ nombre, telefono })

        toast.success(
          "Cliente creado"
        )

        // Emit automation event
        emitEvent(companyId, "customer.created", {
          customerId: newCustomerId,
          name: nombre,
          phone: telefono,
        })
      }

      setNombre("")
      setTelefono("")

    } catch (err) {

      const msg =
        err instanceof Error
          ? err.message
          : "Error al guardar cliente"

      toast.error(msg)
      console.error(
        "[Clientes] Error al guardar:",
        err
      )

    } finally {

      setSaving(false)
    }
  }

  // =========================
  // EDIT
  // =========================

  const handleEdit = (c: Cliente) => {

    setEditingId(c.id || null)

    setNombre(c.nombre)

    setTelefono(c.telefono)
  }

  // =========================
  // DELETE
  // =========================

  const handleDelete = async (
    id?: string
  ) => {

    if (!id || !companyId)
      return

    const confirmDelete =
      window.confirm(
        "¿Eliminar este cliente? Esta acción no se puede deshacer."
      )

    if (!confirmDelete) return

    try {

      await remove(id)

      toast.success(
        "Cliente eliminado"
      )

    } catch {

      toast.error(
        "Error al eliminar cliente"
      )
    }
  }

  // =========================
  // VIP CLIENT
  // =========================

  const vipClient =
    useMemo(() => {

      if (!customers.length)
        return null

      return [...customers].sort(
        (a, b) =>
          (b.totalGastado ?? 0) -
          (a.totalGastado ?? 0)
      )[0]

    }, [customers])

  // =========================
  // KPIS
  // =========================

  const totalClientes =
    customers.length

  const totalIngresos =
    customers.reduce(
      (acc, c) =>
        acc + (c.totalGastado || 0),
      0
    )

  const totalVisitas =
    customers.reduce(
      (acc, c) =>
        acc + (c.visitas || 0),
      0
    )

  // =========================
  // LOADING
  // =========================

  const isLoading =
    showLoading ||
    (loading && customers.length === 0)

  if (isLoading) {

    return (

      <div className="
        p-6
        text-white
      ">

        Cargando clientes...

      </div>
    )
  }

  // =========================
  // NO COMPANY
  // =========================

  if (!companyId) {

    return (

      <div className="
        p-6
        text-red-400
      ">

        Sin empresa asignada

      </div>
    )
  }

  // =========================
  // UI
  // =========================

  return (

    <div className="
      min-h-screen
      p-6
      space-y-8
      text-white
    ">

      {/* HEADER */}

      <div className="space-y-3">

        <div className="
          inline-flex
          items-center
          gap-2
          px-4
          py-2
          rounded-full
          border
          border-zinc-800
          bg-zinc-900/70
          backdrop-blur-xl
          text-zinc-400
          text-sm
        ">

          👥 Gestión de clientes

        </div>

        <h1 className="
          text-5xl
          md:text-6xl
          font-black
          tracking-tight
        ">

          Clientes

        </h1>

        <p className="
          text-zinc-400
          text-lg
        ">

          Administra clientes y relaciones

        </p>

      </div>

      {/* KPIS */}

      <div className="
        grid
        grid-cols-1
        md:grid-cols-2
        xl:grid-cols-4
        gap-5
      ">

        <div className="
          bg-gradient-to-br
          from-blue-950
          to-zinc-900
          border
          border-zinc-800
          rounded-3xl
          p-6
        ">

          <div className="
            flex
            items-center
            justify-between
          ">

            <div>

              <p className="text-zinc-400">
                Clientes
              </p>

              <h2 className="
                text-4xl
                font-bold
                mt-2
              ">

                {totalClientes}

              </h2>

            </div>

            <Users size={40} />

          </div>

        </div>

        <div className="
          bg-gradient-to-br
          from-green-950
          to-zinc-900
          border
          border-zinc-800
          rounded-3xl
          p-6
        ">

          <div className="
            flex
            items-center
            justify-between
          ">

            <div>

              <p className="text-zinc-400">
                Ingresos
              </p>

              <h2 className="
                text-3xl
                font-bold
                mt-2
              ">

                ${totalIngresos}

              </h2>

            </div>

            <Crown size={40} />

          </div>

        </div>

        <div className="
          bg-gradient-to-br
          from-purple-950
          to-zinc-900
          border
          border-zinc-800
          rounded-3xl
          p-6
        ">

          <div className="
            flex
            items-center
            justify-between
          ">

            <div>

              <p className="text-zinc-400">
                Visitas
              </p>

              <h2 className="
                text-4xl
                font-bold
                mt-2
              ">

                {totalVisitas}

              </h2>

            </div>

            <Eye size={40} />

          </div>

        </div>

        <div className="
          bg-gradient-to-br
          from-orange-950
          to-zinc-900
          border
          border-zinc-800
          rounded-3xl
          p-6
        ">

          <div>

            <p className="text-zinc-400">
              Cliente VIP
            </p>

            <h2 className="
              text-2xl
              font-bold
              mt-2
            ">

              {vipClient?.nombre || "N/A"}

            </h2>

          </div>

        </div>

      </div>

      {/* FORM */}

      <div className="
        bg-zinc-900/70
        backdrop-blur-xl
        border
        border-zinc-800
        rounded-3xl
        p-6
      ">

        <div className="mb-6">

          <h2 className="
            text-2xl
            font-bold
          ">

            {editingId
              ? "Editar Cliente"
              : "Nuevo Cliente"}

          </h2>

          <p className="
            text-zinc-400
            mt-1
          ">

            Gestiona tus clientes

          </p>

        </div>

        <div className="
          grid
          md:grid-cols-2
          gap-4
        ">

          <input
            value={nombre}
            onChange={(e) =>
              setNombre(e.target.value)
            }
            placeholder="Nombre"
            className="
              bg-zinc-950
              border
              border-zinc-800
              p-4
              rounded-2xl
              outline-none
            "
          />

          <input
            value={telefono}
            onChange={(e) =>
              setTelefono(e.target.value)
            }
            placeholder="Teléfono"
            className="
              bg-zinc-950
              border
              border-zinc-800
              p-4
              rounded-2xl
              outline-none
            "
          />

        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="
            mt-5
            bg-white
            text-black
            px-6
            py-4
            rounded-2xl
            font-bold
            hover:scale-[1.02]
            transition
            flex
            items-center
            gap-2
            disabled:opacity-50
            disabled:cursor-not-allowed
            disabled:hover:scale-100
          "
        >

          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <UserPlus size={18} />
          )}

          {saving
            ? "Guardando..."
            : editingId
            ? "Actualizar Cliente"
            : "Crear Cliente"}

        </button>

      </div>

      {/* SEARCH */}

      <div className="relative">

        <Search
          className="
            absolute
            left-4
            top-4
            text-zinc-500
          "
          size={20}
        />

        <input
          value={searchInput}
          onChange={(e) =>
            setSearchInput(e.target.value)
          }
          placeholder="Buscar cliente..."
          className="
            w-full
            pl-12
            p-4
            rounded-2xl
            bg-zinc-900
            border
            border-zinc-800
            outline-none
          "
        />

      </div>

      {/* CLIENTES */}

      {customers.length === 0 && (

        <div className="
          bg-zinc-900
          border
          border-zinc-800
          rounded-3xl
          p-12
          text-center
          text-zinc-500
        ">

          <div className="
            text-5xl
            mb-4
          ">
            👥
          </div>

          <h3 className="
            text-xl
            font-bold
            text-zinc-300
          ">

            {searchInput
              ? "Sin resultados"
              : "No hay clientes todavía"
            }

          </h3>

          <p className="mt-2">
            {searchInput
              ? "Prueba con otro término de búsqueda"
              : "Crea tu primer cliente desde el formulario"
            }
          </p>

        </div>
      )}

      <div className="
        grid
        grid-cols-1
        xl:grid-cols-2
        gap-5
      ">

        {customers.map((c) => (

          <div
            key={c.id}
            className="
              relative
              overflow-hidden
              bg-zinc-900/70
              backdrop-blur-xl
              border
              border-zinc-800
              rounded-3xl
              p-6
              hover:border-zinc-700
              transition
            "
          >

            <div className="
              absolute
              -top-10
              -right-10
              w-32
              h-32
              bg-white/5
              rounded-full
              blur-3xl
            " />

            <div className="
              flex
              items-start
              justify-between
            ">

              <div>

                <h2 className="
                  text-2xl
                  font-bold
                ">

                  {c.nombre}

                </h2>

                <div className="
                  flex
                  items-center
                  gap-2
                  mt-2
                  text-zinc-400
                ">

                  <Phone size={16} />

                  {c.telefono}

                </div>

              </div>

              <div className="
                px-3
                py-1
                rounded-full
                bg-green-500/20
                text-green-400
                text-sm
                font-bold
              ">

                {c.estado}

              </div>

            </div>

            <div className="
              grid
              grid-cols-2
              gap-4
              mt-6
            ">

              <div className="
                bg-zinc-950
                border
                border-zinc-800
                rounded-2xl
                p-4
              ">

                <p className="
                  text-zinc-400
                  text-sm
                ">

                  Visitas

                </p>

                <h3 className="
                  text-3xl
                  font-bold
                  mt-1
                ">

                  {c.visitas}

                </h3>

              </div>

              <div className="
                bg-zinc-950
                border
                border-zinc-800
                rounded-2xl
                p-4
              ">

                <p className="
                  text-zinc-400
                  text-sm
                ">

                  Total Gastado

                </p>

                <h3 className="
                  text-2xl
                  font-bold
                  mt-1
                  text-green-400
                ">

                  ${c.totalGastado}

                </h3>

              </div>

            </div>

            <div className="
              mt-5
              text-sm
              text-zinc-500
            ">

              Última visita:
              {" "}
              {c.ultimaVisita}

            </div>

            <div className="
              flex
              gap-3
              mt-6
            ">

              <Link
                href={`/clientes/${c.id}`}
                className="
                  flex-1
                  bg-white
                  text-black
                  p-3
                  rounded-2xl
                  font-bold
                  flex
                  items-center
                  justify-center
                  gap-2
                  hover:scale-[1.02]
                  transition
                "
              >

                <Eye size={18} />

                Ver Perfil

              </Link>

              <button
                onClick={() =>
                  handleEdit(c)
                }
                className="
                  bg-blue-600
                  hover:bg-blue-500
                  p-3
                  rounded-2xl
                  transition
                "
              >

                <Pencil size={18} />

              </button>

              <button
                onClick={() =>
                  handleDelete(c.id)
                }
                className="
                  bg-red-600
                  hover:bg-red-500
                  p-3
                  rounded-2xl
                  transition
                "
              >

                <Trash2 size={18} />

              </button>

            </div>

          </div>
        ))}

      </div>

      {/* LOAD MORE */}

      {hasMore && (

        <div className="flex justify-center">

          <button
            onClick={loadMore}
            className="
              bg-zinc-900
              border
              border-zinc-800
              text-white
              px-8
              py-4
              rounded-2xl
              font-bold
              hover:border-zinc-700
              transition
            "
          >

            Cargar más clientes

          </button>

        </div>
      )}

    </div>
  )
}
