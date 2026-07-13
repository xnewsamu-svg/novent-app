"use client"

import { useEffect, useMemo, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { emitEvent } from "@/lib/automations/events"
import { toast } from "sonner"
import {
  Package, AlertTriangle, Boxes, Pencil, Trash2,
  Search, DollarSign, Loader2,
} from "lucide-react"
import { useInventory } from "@/src/hooks/useInventory"
import type { ProductRecord } from "@/src/services/inventory.service"

// =========================
// PAGE
// =========================

export default function InventarioPage() {

  // =========================
  // STATES
  // =========================

  const [companyId, setCompanyId] =
    useState<string | null>(null)

  const [nombre, setNombre] =
    useState("")

  const [categoria, setCategoria] =
    useState("")

  const [precio, setPrecio] =
    useState(0)

  const [costo, setCosto] =
    useState(0)

  const [stock, setStock] =
    useState(0)

  const [stockMinimo, setStockMinimo] =
    useState(3)

  const [searchInput, setSearchInput] =
    useState("")

  const [editingId, setEditingId] =
    useState<string | null>(null)

  const [saving, setSaving] =
    useState(false)

  const {
    products,
    loading,
    create,
    update,
    remove,
    hasMore,
    loadMore,
    setSearch,
  } = useInventory(companyId, true, { pageSize: 50 })

  // =========================
  // AUTH
  // =========================

  useEffect(() => {

    const unsubAuth =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (!user) return

          const userData =
            await getUserCompany(user.uid)

          if (!userData) return

          setCompanyId(userData.companyId)
        }
      )

    return () => unsubAuth()

  }, [])

  const pageLoading = !companyId ? false : loading

  // =========================
  // SEARCH DEBOUNCE
  // =========================

  useEffect(() => {

    const timer =
      setTimeout(
        () => setSearch(searchInput),
        300,
      )

    return () => clearTimeout(timer)

  }, [searchInput, setSearch])

  // =========================
  // SAVE PRODUCT
  // =========================

  const handleSave = async () => {

    if (!nombre || !categoria || !precio)
      return

    setSaving(true)

    try {

      if (editingId) {

        await update(editingId, {
          nombre, categoria, precio, costo, stock, stockMinimo,
        })

        setEditingId(null)

        toast.success(
          "Producto actualizado"
        )

        if (stock <= stockMinimo) {
          emitEvent(companyId!, "inventory.low_stock", {
            productId: editingId,
            name: nombre,
            stock,
            stockMinimo,
          })
        }

        if (stock === 0) {
          emitEvent(companyId!, "inventory.out_of_stock", {
            productId: editingId,
            name: nombre,
          })
        }

      } else {

        const productId =
          await create({
            nombre, categoria, precio, costo, stock, stockMinimo,
          })

        toast.success(
          "Producto creado"
        )

        emitEvent(companyId!, "inventory.product_created", {
          productId,
          name: nombre,
          category: categoria,
          price: precio,
          stock,
        })

        if (stock <= stockMinimo) {
          emitEvent(companyId!, "inventory.low_stock", {
            productId,
            name: nombre,
            stock,
            stockMinimo,
          })
        }

        if (stock === 0) {
          emitEvent(companyId!, "inventory.out_of_stock", {
            productId,
            name: nombre,
          })
        }
      }

      setNombre("")
      setCategoria("")
      setPrecio(0)
      setCosto(0)
      setStock(0)
      setStockMinimo(3)

    } catch {

      toast.error(
        "Error al guardar producto"
      )

    } finally {

      setSaving(false)
    }
  }

  // =========================
  // EDIT
  // =========================

  const handleEdit =
    (producto: ProductRecord) => {

      setEditingId(producto.id || null)

      setNombre(producto.nombre)

      setCategoria(producto.categoria)

      setPrecio(producto.precio)

      setCosto(producto.costo ?? 0)

      setStock(producto.stock)

      setStockMinimo(producto.stockMinimo ?? 3)
    }

  // =========================
  // DELETE
  // =========================

  const handleDelete =
    async (id?: string) => {

      if (!id) return

      const confirmDelete =
        window.confirm(
          "¿Eliminar este producto? Esta acción no se puede deshacer."
        )

      if (!confirmDelete) return

      try {

        await remove(id)

        toast.success(
          "Producto eliminado"
        )

      } catch {

        toast.error(
          "Error al eliminar producto"
        )
      }
    }

  // =========================
  // KPIS
  // =========================

  const totalProductos =
    products.length

  const stockBajo =
    products.filter(
      (p) => p.stock <= (p.stockMinimo ?? 3)
    ).length

  const valorInventario =
    products.reduce(
      (acc, p) =>
        acc + (p.precio * p.stock),
      0
    )

  const costoTotalInventario =
    products.reduce(
      (acc, p) =>
        acc + ((p.costo ?? 0) * p.stock),
      0
    )

  const gastoMensualEstimado =
    products.reduce(
      (acc, p) => {
        const c = p.costo ?? 0
        const s = p.stock
        const sm = p.stockMinimo ?? 3
        const rotacion = s > sm ? 1 : Math.max(0.5, s / Math.max(sm, 1))
        return acc + (c * rotacion)
      },
      0
    )

  const productoTop =
    useMemo(() => {
      if (products.length === 0)
        return null

      return [...products].sort(
        (a, b) =>
          (b.precio * b.stock) -
          (a.precio * a.stock)
      )[0]
    }, [products])

  // =========================
  // LOADING
  // =========================

  if (pageLoading) {
    return (
      <div className="p-6 text-white">
        Cargando inventario...
      </div>
    )
  }

  // =========================
  // UI
  // =========================

  return (
    <div className="p-6 text-white space-y-8">

      {/* HEADER */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tight">
            Inventario
          </h1>
          <p className="text-zinc-400 mt-2">
            Gestión inteligente de productos
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl px-5 py-4">
          <p className="text-zinc-400 text-sm">
            Productos totales
          </p>
          <p className="text-3xl font-bold">
            {totalProductos}
          </p>
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

        <div className="bg-gradient-to-br from-blue-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400">
                Productos
              </p>
              <h2 className="text-4xl font-bold mt-2">
                {totalProductos}
              </h2>
            </div>
            <Boxes size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400">
                Stock bajo
              </p>
              <h2 className="text-4xl font-bold mt-2">
                {stockBajo}
              </h2>
            </div>
            <AlertTriangle size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400">
                Valor inventario
              </p>
              <h2 className="text-2xl font-bold mt-2">
                ${valorInventario.toLocaleString()}
              </h2>
            </div>
            <DollarSign size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400">
                Producto top
              </p>
              <h2 className="text-xl font-bold mt-2">
                {productoTop?.nombre || "N/A"}
              </h2>
            </div>
            <Package size={40} />
          </div>
        </div>

        {costoTotalInventario > 0 && (
          <div className="bg-gradient-to-br from-amber-950 to-zinc-900 border border-zinc-800 rounded-3xl p-6 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">
                  Gasto mensual estimado
                </p>
                <h2 className="text-2xl font-bold mt-2 text-amber-400">
                  ${gastoMensualEstimado.toLocaleString()}
                </h2>
                <p className="text-zinc-500 text-xs mt-1">
                  Costo total en inventario: ${costoTotalInventario.toLocaleString()}
                </p>
              </div>
              <DollarSign size={40} className="text-amber-500" />
            </div>
          </div>
        )}
      </div>

      {/* FORM */}

      <div className="
        bg-zinc-900
        border
        border-zinc-800
        rounded-3xl
        p-6
        md:p-8
      ">

        <div className="mb-8">
          <h2 className="text-2xl font-bold">
            {editingId
              ? "Editar producto"
              : "Nuevo producto"}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Registra los servicios o productos que ofreces en tu negocio
          </p>
        </div>

        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          gap-5
        ">

          {/* NOMBRE */}

          <div>
            <label className="
              block
              text-sm
              font-medium
              text-zinc-300
              mb-2
            ">
              Nombre del producto
            </label>
            <input
              placeholder="Ej: Corte de cabello"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              className="
                w-full
                bg-zinc-950
                border
                border-zinc-800
                px-4
                py-3
                rounded-2xl
                text-sm
                outline-none
                transition-colors
                duration-200
                focus:border-zinc-600
                placeholder:text-zinc-700
              "
            />
          </div>

          {/* CATEGORÍA */}

          <div>
            <label className="
              block
              text-sm
              font-medium
              text-zinc-300
              mb-2
            ">
              Categoría
            </label>
            <input
              placeholder="Ej: Cuidado personal"
              value={categoria}
              onChange={(e) =>
                setCategoria(e.target.value)
              }
              className="
                w-full
                bg-zinc-950
                border
                border-zinc-800
                px-4
                py-3
                rounded-2xl
                text-sm
                outline-none
                transition-colors
                duration-200
                focus:border-zinc-600
                placeholder:text-zinc-700
              "
            />
          </div>

          {/* PRECIO */}

          <div>
            <label className="
              block
              text-sm
              font-medium
              text-zinc-300
              mb-2
            ">
              Precio
            </label>
            <div className="relative">
              <span className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-zinc-500
                text-sm
                font-medium
              ">
                $
              </span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={precio || ""}
                onChange={(e) =>
                  setPrecio(Number(e.target.value))
                }
                className="
                  w-full
                  bg-zinc-950
                  border
                  border-zinc-800
                  px-4
                  py-3
                  pl-8
                  rounded-2xl
                  text-sm
                  outline-none
                  transition-colors
                  duration-200
                  focus:border-zinc-600
                  placeholder:text-zinc-700
                "
              />
            </div>
          </div>

          {/* COSTO */}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Costo por unidad
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">$</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={costo || ""}
                onChange={(e) => setCosto(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 pl-8 rounded-2xl text-sm outline-none transition-colors duration-200 focus:border-zinc-600 placeholder:text-zinc-700"
              />
            </div>
            <p className="text-zinc-600 text-xs mt-1.5">
              Cuánto pagaste por cada unidad
            </p>
          </div>

          {/* STOCK INICIAL */}

          <div>
            <label className="
              block
              text-sm
              font-medium
              text-zinc-300
              mb-2
            ">
              Stock inicial
            </label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={stock || ""}
              onChange={(e) =>
                setStock(Number(e.target.value))
              }
              className="
                w-full
                bg-zinc-950
                border
                border-zinc-800
                px-4
                py-3
                rounded-2xl
                text-sm
                outline-none
                transition-colors
                duration-200
                focus:border-zinc-600
                placeholder:text-zinc-700
              "
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Cantidad disponible al iniciar
            </p>
          </div>

          {/* STOCK MÍNIMO */}

          <div className="md:col-start-2">
            <label className="
              block
              text-sm
              font-medium
              text-zinc-300
              mb-2
            ">
              Stock mínimo
            </label>
            <input
              type="number"
              min={0}
              placeholder="3"
              value={stockMinimo || ""}
              onChange={(e) =>
                setStockMinimo(Number(e.target.value))
              }
              className="
                w-full
                bg-zinc-950
                border
                border-zinc-800
                px-4
                py-3
                rounded-2xl
                text-sm
                outline-none
                transition-colors
                duration-200
                focus:border-zinc-600
                placeholder:text-zinc-700
              "
            />
            <p className="text-zinc-600 text-xs mt-1.5">
              Si el stock baja de esta cantidad, se mostrará una alerta
            </p>
          </div>
        </div>

        <div className="
          flex
          items-center
          gap-3
          mt-8
          pt-6
          border-t
          border-zinc-800
        ">
          <button
            onClick={handleSave}
            disabled={saving}
            className="
              bg-white
              text-black
              px-8
              py-3.5
              rounded-2xl
              font-bold
              text-sm
              hover:bg-zinc-200
              transition-all
              duration-200
              flex
              items-center
              gap-2
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Package size={18} />
            )}
            {saving
              ? "Guardando..."
              : editingId
              ? "Actualizar Producto"
              : "Guardar producto"}
          </button>

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null)
                setNombre("")
                setCategoria("")
                setPrecio(0)
                setStock(0)
                setStockMinimo(3)
              }}
              className="
                text-zinc-500
                text-sm
                font-medium
                hover:text-white
                transition-colors
                duration-200
                px-4
                py-3.5
                rounded-2xl
              "
            >
              Cancelar
            </button>
          )}
        </div>
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
          placeholder="Buscar producto..."
          value={searchInput}
          onChange={(e) =>
            setSearchInput(e.target.value)
          }
          className="
            w-full
            pl-12
            p-4
            rounded-2xl
            bg-zinc-900
            border
            border-zinc-800
          "
        />
      </div>

      {/* PRODUCTS GRID */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {products.length === 0 && (
          <div className="
            bg-zinc-900
            border
            border-zinc-800
            rounded-3xl
            p-12
            text-center
            text-zinc-500
            col-span-full
          ">
            <div className="
              text-5xl
              mb-4
            ">
              �
            </div>
            <h3 className="
              text-xl
              font-bold
              text-zinc-300
            ">
              {searchInput
                ? "Sin resultados"
                : "No hay productos todavía"
              }
            </h3>
            <p className="mt-2">
              {searchInput
                ? "Prueba con otro término de búsqueda"
                : "Agrega tu primer producto desde el formulario"
              }
            </p>
          </div>
        )}

        {products.map((producto) => (
          <div
            key={producto.id}
            className="
              relative
              overflow-hidden
              bg-zinc-900
              border
              border-zinc-800
              rounded-3xl
              p-6
              hover:border-zinc-700
              transition
            "
          >
            {/* GLOW */}

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

            {/* TOP */}

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {producto.nombre}
                </h2>
                <p className="text-zinc-400 mt-1">
                  {producto.categoria}
                </p>
              </div>
              <div className={`
                px-3
                py-1
                rounded-full
                text-sm
                font-bold
                ${producto.stock <= (producto.stockMinimo ?? 3)
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400"}
              `}>
                {producto.stock <= (producto.stockMinimo ?? 3)
                  ? "Stock Bajo"
                  : "Disponible"}
              </div>
            </div>

            {/* INFO */}

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Precio</p>
                <h3 className="text-2xl font-bold mt-1 text-green-400">
                  ${producto.precio}
                </h3>
              </div>
              {(producto.costo ?? 0) > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Costo</p>
                  <h3 className="text-2xl font-bold mt-1 text-amber-400">
                    ${producto.costo}
                  </h3>
                </div>
              )}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Stock</p>
                <h3 className="text-2xl font-bold mt-1">
                  {producto.stock}
                </h3>
              </div>
            </div>

            {/* ACTIONS */}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() =>
                  handleEdit(producto)
                }
                className="
                  flex-1
                  bg-blue-600
                  hover:bg-blue-500
                  p-3
                  rounded-2xl
                  transition
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                <Pencil size={18} />
                Editar
              </button>
              <button
                onClick={() =>
                  handleDelete(producto.id)
                }
                className="
                  bg-red-600
                  hover:bg-red-500
                  p-3
                  px-5
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

            Cargar más productos

          </button>

        </div>
      )}

    </div>
  )
}

