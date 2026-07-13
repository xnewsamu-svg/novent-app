"use client"

import { useEffect, useMemo, useState } from "react"

import {
  onAuthStateChanged,
  User,
} from "firebase/auth"


import {
  DollarSign,
  ShoppingCart,
  Trash2,
  Sparkles,
  TrendingUp,
  User2,
  Calendar,
  Package,
  Loader2,
  ChevronDown,
} from "lucide-react"

import { toast } from "sonner"

import { auth } from "@/lib/firebase"

import { getUserCompany } from "@/lib/getUserCompany"
import { emitEvent } from "@/lib/automations/events"
import { useSales } from "@/src/hooks/useSales"
import { useInventory } from "@/src/hooks/useInventory"
import { useCustomers } from "@/src/hooks/useCustomers"

// =========================
// PAGE
// =========================

export default function VentasPage() {

  // =========================
  // STATES
  // =========================

  const [user, setUser] =
    useState<User | null>(null)

  const [companyId, setCompanyId] =
    useState("")

  const [clienteId, setClienteId] =
    useState("")

  const [showNewCliente, setShowNewCliente] =
    useState(false)

  const [newClienteNombre, setNewClienteNombre] =
    useState("")

  const [newClienteTelefono, setNewClienteTelefono] =
    useState("")

  const [productoId, setProductoId] =
    useState("")

  const [cantidad, setCantidad] =
    useState(1)

  const [creating, setCreating] =
    useState(false)

  const [deleting, setDeleting] =
    useState<string | null>(null)

  const { sales: ventas, loading: ventasLoading, hasMore: hasMoreSales, loadMore: loadMoreSales, create, remove } = useSales(
    companyId || null,
    { pageSize: 50 },
  )

  const { products: productos } = useInventory(companyId || null, true)

  const { customers: clientes } = useCustomers(companyId || null, true)

  // =========================
  // AUTH + REALTIME
  // =========================

  useEffect(() => {

    const unsubAuth =
      onAuthStateChanged(
        auth,
        async (u) => {

          if (!u) return

          setUser(u)

          const userData =
            await getUserCompany(u.uid)

          if (!userData) return

          setCompanyId(userData.companyId)
        }
      )

    return () => {
      unsubAuth()
    }

  }, [])

  // =========================
  // PRODUCTO SELECCIONADO
  // =========================

  const productoSeleccionado =
    productos.find(
      (p) => p.id === productoId
    )

  const totalVenta =
    productoSeleccionado
      ? productoSeleccionado.precio * cantidad
      : 0

  // =========================
  // CREAR VENTA
  // =========================

  const crearVenta = async () => {

    if (
      !user ||
      !companyId ||
      !productoId
    ) {

      toast.error(
        "Completa todos los campos"
      )

      return
    }

    if (!clienteId && !newClienteNombre) {
      toast.error("Selecciona un cliente o ingresa el nombre del nuevo cliente")
      return
    }

    if (
      !productoSeleccionado ||
      productoSeleccionado.stock < cantidad
    ) {

      const disponible =
        productoSeleccionado?.stock || 0

      toast.error(
        `Stock insuficiente. Disponible: ${disponible}`
      )

      return
    }

    const total =
      productoSeleccionado.precio * cantidad

    setCreating(true)

    try {

      // capture values before resetting form
      const capturedClienteId = clienteId
      const capturedProductoId = productoId
      const capturedCantidad = cantidad
      const capturedCliente = capturedClienteId ? clientes.find(c => c.id === capturedClienteId) : null

      const { saleId: newSaleId, newCustomerId } = await create({
        cliente: capturedClienteId || "",
        clienteNombre: newClienteNombre || capturedCliente?.nombre,
        clienteTelefono: newClienteTelefono || capturedCliente?.telefono,
        productoId: capturedProductoId,
        cantidad: capturedCantidad,
        nombreProducto: productoSeleccionado.nombre,
        precioProducto: productoSeleccionado.precio,
      })

      setClienteId("")
      setNewClienteNombre("")
      setNewClienteTelefono("")
      setShowNewCliente(false)
      setProductoId("")
      setCantidad(1)

      toast.success(
        "Venta registrada"
      )

      // Emit automation events
      if (newCustomerId) {
        emitEvent(companyId, "customer.created", {
          customerId: newCustomerId,
          name: newClienteNombre || "",
          phone: newClienteTelefono || "",
        })
      }
      emitEvent(companyId, "sale.created", {
        saleId: newSaleId,
        customerId: newCustomerId || capturedClienteId || "",
        customerName: newClienteNombre || capturedCliente?.nombre || "",
        totalAmount: total,
        productId: capturedProductoId,
        productName: productoSeleccionado.nombre,
        quantity: capturedCantidad,
      })

    } catch (err) {

      toast.error(
        err instanceof Error
          ? err.message
          : "Error al registrar venta"
      )

    } finally {

      setCreating(false)
    }
  }

  // =========================
  // DELETE VENTA
  // =========================

  const eliminarVenta =
    async (id?: string) => {

      if (!id || !companyId) return

      const confirmDelete =
        window.confirm(
          "¿Eliminar esta venta? El stock y datos del cliente se revertirán."
        )

      if (!confirmDelete) return

      setDeleting(id)

      try {

        await remove(id)

        toast.success(
          "Venta eliminada y datos revertidos"
        )

      } catch {

        toast.error(
          "Error al eliminar venta"
        )

      } finally {

        setDeleting(null)
      }
    }

  // =========================
  // KPIS
  // =========================

  const totalIngresos =
    ventas.reduce(
      (acc, v) =>
        acc + (v.precio || 0),
      0
    )

  const ingresosHoy =
    ventas
      .filter((v) => {

        const today =
          new Date()
            .toISOString()
            .split("T")[0]

        return v.fecha === today
      })

      .reduce(
        (acc, v) =>
          acc + (v.precio || 0),
        0
      )

  const servicioTop =
    useMemo(() => {

      const grouped:
        Record<string, number> = {}

      ventas.forEach((v) => {

        grouped[v.servicio] =
          (grouped[v.servicio] || 0) + 1
      })

      const sorted =
        Object.entries(grouped).sort(
          (a, b) => b[1] - a[1]
        )

      return sorted[0]?.[0] || "N/A"

    }, [ventas])

  // =========================
  // LOADING
  // =========================

  if (!companyId || ventasLoading) {

    return (
      <div className="
        p-6
        text-white
      ">
        Cargando POS...
      </div>
    )
  }

  // =========================
  // UI
  // =========================

  return (

    <div className="
      p-6
      space-y-8
      text-white
    ">

      {/* HEADER */}

      <div className="
        flex
        items-center
        justify-between
        flex-wrap
        gap-4
      ">

        <div>

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
            text-zinc-400
            text-sm
            mb-4
          ">

            💰 Sistema POS

          </div>

          <h1 className="
            text-5xl
            font-black
            tracking-tight
          ">
            Ventas
          </h1>

          <p className="
            text-zinc-400
            mt-2
          ">
            Gestión inteligente multiempresa
          </p>

        </div>

        <div className="
          bg-zinc-900/70
          backdrop-blur-xl
          border
          border-zinc-800
          rounded-3xl
          px-5
          py-4
        ">

          <p className="
            text-zinc-400
            text-sm
          ">
            Usuario activo
          </p>

          <p className="
            font-bold
            mt-1
          ">
            {user?.email}
          </p>

        </div>

      </div>

      {/* STATS */}

      <div className="
        grid
        grid-cols-1
        md:grid-cols-2
        xl:grid-cols-4
        gap-5
      ">

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
                Ingresos Hoy
              </p>

              <h2 className="
                text-4xl
                font-bold
                mt-2
              ">
                ${ingresosHoy.toLocaleString()}
              </h2>

            </div>

            <DollarSign size={40} />

          </div>

        </div>

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
                Total Ingresos
              </p>

              <h2 className="
                text-4xl
                font-bold
                mt-2
              ">
                ${totalIngresos.toLocaleString()}
              </h2>

            </div>

            <TrendingUp size={40} />

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
                Ventas
              </p>

              <h2 className="
                text-4xl
                font-bold
                mt-2
              ">
                {ventas.length}
              </h2>

            </div>

            <ShoppingCart size={40} />

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

          <div className="
            flex
            items-center
            justify-between
          ">

            <div>

              <p className="text-zinc-400">
                Servicio Top
              </p>

              <h2 className="
                text-2xl
                font-bold
                mt-2
              ">
                {servicioTop}
              </h2>

            </div>

            <Sparkles size={40} />

          </div>

        </div>

      </div>

      {/* ═══════════════════════ */}
      {/* POS */}
      {/* ═══════════════════════ */}

      <div className="
        grid
        grid-cols-1
        xl:grid-cols-3
        gap-6
        items-start
      ">

        {/* CLIENTE */}

        <div className="
          bg-zinc-900/70
          border
          border-zinc-800
          rounded-3xl
          p-6
        ">

          <div className="
            flex
            items-center
            justify-between
            mb-6
          ">

            <div className="flex items-center gap-3">
              <User2 className="text-zinc-400" size={22} />
              <h2 className="text-xl font-bold">Cliente</h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowNewCliente(!showNewCliente)
                setClienteId("")
              }}
              className={`
                text-xs font-medium px-3 py-1.5 rounded-xl transition-colors
                ${showNewCliente
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                }
              `}
            >
              {showNewCliente ? "Usar existente" : "+ Nuevo"}
            </button>

          </div>

          {showNewCliente ? (
            <div className="space-y-3">
              <input
                value={newClienteNombre}
                onChange={(e) => setNewClienteNombre(e.target.value)}
                placeholder="Nombre del cliente"
                className="
                  w-full bg-zinc-950 text-white border border-zinc-800
                  px-4 py-3.5 rounded-2xl outline-none text-sm
                  focus:border-zinc-600 transition-colors
                "
              />
              <input
                value={newClienteTelefono}
                onChange={(e) => setNewClienteTelefono(e.target.value)}
                placeholder="Teléfono (opcional)"
                className="
                  w-full bg-zinc-950 text-white border border-zinc-800
                  px-4 py-3.5 rounded-2xl outline-none text-sm
                  focus:border-zinc-600 transition-colors
                "
              />
            </div>
          ) : (
            <div className="relative">
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="
                  w-full appearance-none bg-zinc-950 text-white
                  border border-zinc-800 px-4 py-3.5 pr-12
                  rounded-2xl outline-none text-sm cursor-pointer
                  transition-colors duration-200 focus:border-zinc-600
                "
              >
                <option value="">Selecciona cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500">
                <ChevronDown size={16} />
              </div>
            </div>
          )}

        </div>

        {/* PRODUCTO */}

        <div className="
          bg-zinc-900/70
          border
          border-zinc-800
          rounded-3xl
          p-6
        ">

          <div className="
            flex
            items-center
            gap-3
            mb-6
          ">

            <Package className="text-zinc-400" size={22} />

            <h2 className="
              text-xl
              font-bold
            ">
              Producto
            </h2>

          </div>

          <div className="relative">

            <select
              value={productoId}
              onChange={(e) => {
                setProductoId(e.target.value)
                setCantidad(1)
              }}
              className="
                w-full
                appearance-none
                bg-zinc-950
                text-white
                border
                border-zinc-800
                px-4
                py-3.5
                pr-12
                rounded-2xl
                outline-none
                text-sm
                cursor-pointer
                transition-colors
                duration-200
                focus:border-zinc-600
              "
            >

              <option value="">
                Selecciona producto
              </option>

              {productos.map((p) => (

                <option
                  key={p.id}
                  value={p.id}
                  disabled={p.stock < 1}
                >
                  {p.nombre} — ${p.precio}
                </option>
              ))}

            </select>

            <div className="
              pointer-events-none
              absolute
              inset-y-0
              right-0
              flex
              items-center
              pr-4
              text-zinc-500
            ">
              <ChevronDown size={16} />
            </div>

          </div>

          {/* Stock / Precio */}

          {productoSeleccionado && (

            <div className="
              mt-5
              space-y-4
            ">

              <div className="
                bg-zinc-950
                border
                border-zinc-800
                rounded-2xl
                p-4
              ">

                <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">
                  Stock disponible
                </p>

                <p className="
                  text-2xl
                  font-bold
                  text-green-400
                  mt-1
                ">
                  {productoSeleccionado.stock} uds
                </p>

              </div>

              <div className="
                flex
                items-center
                gap-3
              ">

                <label className="
                  text-zinc-400
                  text-sm
                  shrink-0
                ">
                  Cantidad
                </label>

                <input
                  type="number"
                  min={1}
                  max={
                    productoSeleccionado.stock
                  }
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(
                      Math.min(
                        Number(e.target.value) || 1,
                        productoSeleccionado.stock
                      )
                    )
                  }
                  className="
                    w-24
                    bg-zinc-950
                    text-white
                    border
                    border-zinc-800
                    p-3
                    rounded-2xl
                    text-center
                    outline-none
                    text-sm
                    transition-colors
                    duration-200
                    focus:border-zinc-600
                  "
                />

              </div>

            </div>
          )}

          {!productoSeleccionado && (

            <div className="
              mt-5
              py-4
              text-center
              text-zinc-600
              text-sm
            ">
              Selecciona un producto para ver stock y cantidad
            </div>
          )}

        </div>

        {/* TOTAL */}

        <div className="
          bg-zinc-900/70
          border
          border-zinc-800
          rounded-3xl
          p-6
          flex
          flex-col
          gap-5
        ">

          <div>

            <div className="
              flex
              items-center
              gap-3
              mb-6
            ">

              <DollarSign className="text-zinc-400" size={22} />

              <h2 className="
                text-xl
                font-bold
              ">
                Total
              </h2>

            </div>

            <div className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-5
            ">

              <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">
                Total a cobrar
              </p>

              <p className="
                text-4xl
                font-black
                mt-1
                text-green-400
              ">
                ${totalVenta.toLocaleString()}
              </p>

            </div>

          </div>

          <button
            onClick={crearVenta}
            disabled={
              creating ||
              !clienteId ||
              !productoId ||
              !productoSeleccionado ||
              productoSeleccionado.stock < cantidad
            }
            className="
              w-full
              bg-green-500
              hover:bg-green-400
              disabled:bg-zinc-800
              disabled:text-zinc-600
              disabled:cursor-not-allowed
              text-black
              py-4
              rounded-2xl
              font-bold
              text-base
              transition-all
              duration-200
              flex
              items-center
              justify-center
              gap-2
            "
          >

            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Registrando...
              </>
            ) : !productoSeleccionado ? (
              "Selecciona un producto"
            ) : productoSeleccionado.stock < cantidad ? (
              "Stock insuficiente"
            ) : (
              "Registrar Venta"
            )}

          </button>

        </div>

      </div>

      {/* HISTORIAL */}

      <div className="
        bg-zinc-900/70
        backdrop-blur-xl
        border
        border-zinc-800
        rounded-3xl
        p-6
      ">

        <div className="
          flex
          items-center
          justify-between
          mb-6
        ">

          <div>

            <h2 className="
              text-2xl
              font-bold
            ">
              Historial de ventas
            </h2>

            <p className="
              text-zinc-400
              mt-1
            ">
              Últimos movimientos registrados
            </p>

          </div>

          <div className="
            w-3
            h-3
            bg-green-500
            rounded-full
            animate-pulse
          " />

        </div>

        <div className="space-y-4">

          {ventas.length === 0 && (

            <div className="
              flex
              flex-col
              items-center
              justify-center
              py-12
            ">

              <div className="
                w-20
                h-20
                rounded-full
                bg-zinc-800
                flex
                items-center
                justify-center
                text-4xl
                mb-4
              ">
                💰
              </div>

              <h3 className="
                text-xl
                font-bold
              ">
                Sin ventas todavía
              </h3>

              <p className="
                text-zinc-500
                mt-2
              ">
                Las ventas aparecerán aquí
              </p>

            </div>
          )}

          {ventas.map((venta) => {

            const cliente =
              clientes.find(
                (c) =>
                  c.id === venta.cliente
              )

            return (

              <div
                key={venta.id}
                className="
                  bg-zinc-950
                  border
                  border-zinc-800
                  rounded-3xl
                  p-5
                  flex
                  items-center
                  justify-between
                  hover:border-zinc-700
                  hover:scale-[1.01]
                  transition-all
                  duration-300
                "
              >

                <div>

                  <h3 className="
                    text-xl
                    font-bold
                  ">
                    {venta.servicio}
                  </h3>

                  <div className="
                    flex
                    items-center
                    gap-2
                    text-zinc-400
                    mt-2
                  ">

                    <User2 size={14} />

                    <p>
                      {cliente?.nombre || "Cliente"}
                    </p>

                  </div>

                  <div className="
                    flex
                    items-center
                    gap-2
                    text-zinc-500
                    mt-1
                  ">

                    <Calendar size={14} />

                    <p>
                      {venta.fecha} - {venta.hora}
                    </p>

                  </div>

                  <div className="
                    text-zinc-500
                    text-sm
                    mt-1
                  ">
                    {venta.cantidad || 1} unidad(es)
                  </div>

                </div>

                <div className="
                  flex
                  items-center
                  gap-4
                ">

                  <div className="text-right">

                    <p className="
                      text-zinc-400
                      text-sm
                    ">
                      Total
                    </p>

                    <h3 className="
                      text-3xl
                      font-bold
                      text-green-400
                    ">
                      ${venta.precio}
                    </h3>

                  </div>

                  <button
                    onClick={() =>
                      eliminarVenta(venta.id)
                    }
                    disabled={
                      deleting === venta.id
                    }
                    className="
                      bg-red-600
                      hover:bg-red-500
                      disabled:bg-zinc-800
                      disabled:cursor-not-allowed
                      p-3
                      rounded-2xl
                      transition
                    "
                  >

                    {deleting === venta.id
                      ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      )
                      : (
                        <Trash2 size={18} />
                      )
                    }

                  </button>

                </div>

              </div>
            )
          })}

        </div>

        {hasMoreSales && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMoreSales}
              className="
                flex
                items-center
                gap-2
                bg-zinc-800
                hover:bg-zinc-700
                text-white
                px-6
                py-3
                rounded-2xl
                text-sm
                font-medium
                transition-all
                duration-200
              "
            >
              <ChevronDown size={16} />
              Cargar más ventas
            </button>
          </div>
        )}

      </div>

    </div>
  )
}

