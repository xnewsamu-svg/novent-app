"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { toast } from "sonner"
import {
  Scissors, Pencil, Trash2, Search, Loader2, Clock, ImageUp,
} from "lucide-react"
import { useServicios } from "@/src/hooks/useServicios"
import type { ServicioRecord } from "@/src/services/servicios.service"
import { ImageImportDialog } from "@/components/services/ImageImportDialog"
import type { ServiceImportItem } from "@/types/serviceImport"

export default function ServiciosPage() {

  const [companyId, setCompanyId] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState(0)
  const [descripcion, setDescripcion] = useState("")
  const [duracion, setDuracion] = useState(30)
  const [categoria, setCategoria] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)

  const {
    servicios,
    loading,
    create,
    update,
    remove,
  } = useServicios(companyId)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const userData = await getUserCompany(user.uid)
      if (!userData) return
      setCompanyId(userData.companyId)
    })
    return () => unsubAuth()
  }, [])

  const pageLoading = !companyId ? false : loading

  const filtered = searchInput
    ? servicios.filter(
        (s) =>
          s.nombre.toLowerCase().includes(searchInput.toLowerCase()) ||
          s.categoria.toLowerCase().includes(searchInput.toLowerCase()),
      )
    : servicios

  const handleSave = async () => {
    if (!nombre || !precio) return
    setSaving(true)
    try {
      if (editingId) {
        await update(editingId, { nombre, precio, descripcion, duracion, categoria })
        toast.success("Servicio actualizado")
      } else {
        await create({ nombre, precio, descripcion, duracion, categoria })
        toast.success("Servicio creado")
      }
      setNombre("")
      setPrecio(0)
      setDescripcion("")
      setDuracion(30)
      setCategoria("")
      setEditingId(null)
    } catch {
      toast.error("Error al guardar servicio")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (s: ServicioRecord) => {
    setEditingId(s.id || null)
    setNombre(s.nombre)
    setPrecio(s.precio)
    setDescripcion(s.descripcion)
    setDuracion(s.duracion)
    setCategoria(s.categoria)
  }

  const handleImportSave = async (items: ServiceImportItem[]) => {
    const promises = items.map((item) =>
      create({ nombre: item.name, precio: item.price }),
    )
    await Promise.all(promises)
  }

  const handleDelete = async (id?: string) => {
    if (!id) return
    if (!window.confirm("¿Eliminar este servicio?")) return
    try {
      await remove(id)
      toast.success("Servicio eliminado")
    } catch {
      toast.error("Error al eliminar servicio")
    }
  }

  if (pageLoading) {
    return <div className="p-6 text-white">Cargando servicios...</div>
  }

  return (
    <div className="p-6 text-white space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tight">Servicios</h1>
          <p className="text-zinc-400 mt-2">Catálogo de servicios y precios</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowImportDialog(true)}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 px-5 py-3.5 rounded-2xl transition flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <ImageUp size={18} />
            Importar desde imagen
          </button>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl px-5 py-4">
            <p className="text-zinc-400 text-sm">Total servicios</p>
            <p className="text-3xl font-bold">{servicios.length}</p>
          </div>
        </div>
      </div>

      {/* FORM */}

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">
            {editingId ? "Editar servicio" : "Nuevo servicio"}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Registra los servicios que ofreces con sus precios
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nombre del servicio
            </label>
            <input
              placeholder="Ej: Corte de cabello"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl text-sm outline-none transition-colors duration-200 focus:border-zinc-600 placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Categoría
            </label>
            <input
              placeholder="Ej: Cuidado personal"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl text-sm outline-none transition-colors duration-200 focus:border-zinc-600 placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Precio
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">$</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={precio || ""}
                onChange={(e) => setPrecio(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 pl-8 rounded-2xl text-sm outline-none transition-colors duration-200 focus:border-zinc-600 placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Duración (minutos)
            </label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="number"
                min={5}
                step={5}
                placeholder="30"
                value={duracion || ""}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 pl-11 rounded-2xl text-sm outline-none transition-colors duration-200 focus:border-zinc-600 placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              placeholder="Describe el servicio..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-2xl text-sm outline-none transition-colors duration-200 focus:border-zinc-600 placeholder:text-zinc-700 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={18} className="animate-spin" />
              : <Scissors size={18} />}
            {saving ? "Guardando..." : editingId ? "Actualizar servicio" : "Guardar servicio"}
          </button>

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null)
                setNombre("")
                setPrecio(0)
                setDescripcion("")
                setDuracion(30)
                setCategoria("")
              }}
              className="text-zinc-500 text-sm font-medium hover:text-white transition-colors duration-200 px-4 py-3.5 rounded-2xl"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* SEARCH */}

      <div className="relative">
        <Search className="absolute left-4 top-4 text-zinc-500" size={20} />
        <input
          placeholder="Buscar servicio..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-12 p-4 rounded-2xl bg-zinc-900 border border-zinc-800"
        />
      </div>

      {/* SERVICES GRID */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {filtered.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 col-span-full">
            <div className="text-5xl mb-4">💇</div>
            <h3 className="text-xl font-bold text-zinc-300">
              {searchInput ? "Sin resultados" : "No hay servicios todavía"}
            </h3>
            <p className="mt-2">
              {searchInput ? "Prueba con otro término de búsqueda" : "Agrega tu primer servicio desde el formulario"}
            </p>
          </div>
        )}

        {filtered.map((s) => (
          <div key={s.id} className="relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{s.nombre}</h2>
                <p className="text-zinc-400 mt-1">{s.categoria}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Precio</p>
                <h3 className="text-3xl font-bold mt-1 text-green-400">${s.precio}</h3>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Duración</p>
                <h3 className="text-3xl font-bold mt-1">{s.duracion} min</h3>
              </div>
            </div>

            {s.descripcion && (
              <p className="text-zinc-500 text-sm mt-4">{s.descripcion}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleEdit(s)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 p-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                <Pencil size={18} />
                Editar
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="bg-red-600 hover:bg-red-500 p-3 px-5 rounded-2xl transition"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ImageImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSave={handleImportSave}
      />
    </div>
  )
}
