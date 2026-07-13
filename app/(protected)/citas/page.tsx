"use client"

import { useEffect, useState, useMemo } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { toast } from "sonner"
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Plus, Pencil, Trash2, Loader2, Clock, DollarSign, User,
  CheckCircle, XCircle, AlertCircle,
} from "lucide-react"
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, parse,
} from "date-fns"
import { es } from "date-fns/locale"
import { useCitas } from "@/src/hooks/useCitas"
import type { CitaRecord, CitaStatus } from "@/src/services/citas.service"

const STATUS_STYLES: Record<CitaStatus, { label: string; class: string }> = {
  pendiente: { label: "Pendiente", class: "bg-yellow-500/20 text-yellow-400" },
  confirmada: { label: "Confirmada", class: "bg-blue-500/20 text-blue-400" },
  en_progreso: { label: "En progreso", class: "bg-purple-500/20 text-purple-400" },
  completada: { label: "Completada", class: "bg-green-500/20 text-green-400" },
  cancelada: { label: "Cancelada", class: "bg-red-500/20 text-red-400" },
}

const STATUS_OPTIONS: CitaStatus[] = [
  "pendiente", "confirmada", "en_progreso", "completada", "cancelada",
]

export default function CitasPage() {

  const [companyId, setCompanyId] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formPacienteNombre, setFormPacienteNombre] = useState("")
  const [formPacienteTelefono, setFormPacienteTelefono] = useState("")
  const [formFecha, setFormFecha] = useState(selectedDate)
  const [formHora, setFormHora] = useState("09:00")
  const [formDuracion, setFormDuracion] = useState(30)
  const [formEstado, setFormEstado] = useState<CitaStatus>("pendiente")
  const [formPrecio, setFormPrecio] = useState(0)
  const [formNotas, setFormNotas] = useState("")

  const {
    citas,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
  } = useCitas(companyId)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const userData = await getUserCompany(user.uid)
      if (!userData) return
      setCompanyId(userData.companyId)
    })
    return () => unsubAuth()
  }, [])

  // Calendar helpers

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const citasByDate = useMemo(() => {
    const map = new Map<string, CitaRecord[]>()
    for (const c of citas) {
      const existing = map.get(c.fecha) || []
      existing.push(c)
      map.set(c.fecha, existing)
    }
    return map
  }, [citas])

  const selectedCitas = citasByDate.get(selectedDate) || []

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const resetForm = () => {
    setFormPacienteNombre("")
    setFormPacienteTelefono("")
    setFormFecha(selectedDate)
    setFormHora("09:00")
    setFormDuracion(30)
    setFormEstado("pendiente")
    setFormPrecio(0)
    setFormNotas("")
    setEditingId(null)
  }

  const openNewForm = (date?: string) => {
    resetForm()
    setFormFecha(date || selectedDate)
    setShowForm(true)
  }

  const normalizeTime = (t: string): string => {
    const parts = t.split(":")
    if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
    return "09:00"
  }

  const handleEdit = (c: CitaRecord) => {
    setEditingId(c.id || null)
    setFormPacienteNombre(c.pacienteNombre)
    setFormPacienteTelefono(c.pacienteTelefono)
    setFormFecha(c.fecha)
    setFormHora(normalizeTime(c.hora))
    setFormDuracion(c.duracion)
    setFormEstado(c.estado)
    setFormPrecio(c.precio)
    setFormNotas(c.notas)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formPacienteNombre || !formFecha || !formHora) {
      toast.error("Completa los campos obligatorios")
      return
    }
      setSaving(true)
    try {
      if (editingId) {
        await update(editingId, {
          pacienteNombre: formPacienteNombre,
          pacienteTelefono: formPacienteTelefono,
          fecha: formFecha,
          hora: formHora,
          duracion: formDuracion,
          estado: formEstado,
          precio: formPrecio,
          notas: formNotas,
        })
        toast.success("Cita actualizada")
      } else {
        await create({
          pacienteNombre: formPacienteNombre,
          pacienteTelefono: formPacienteTelefono,
          fecha: formFecha,
          hora: formHora,
          duracion: formDuracion,
          estado: formEstado,
          precio: formPrecio,
          notas: formNotas,
        })
        toast.success("Cita creada")
      }
      setShowForm(false)
      resetForm()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido"
      toast.error(`Error al guardar cita: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: string) => {
    if (!id) return
    if (!window.confirm("¿Eliminar esta cita?")) return
    try {
      await remove(id)
      toast.success("Cita eliminada")
    } catch {
      toast.error("Error al eliminar cita")
    }
  }

  const goToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(format(today, "yyyy-MM-dd"))
  }

  if (!companyId) {
    return <div className="p-6 text-white">Cargando empresa...</div>
  }

  if (error) {
    return (
      <div className="p-6 text-white">
        <div className="bg-red-900/30 border border-red-800/50 rounded-2xl p-6">
          <p className="text-red-400 font-bold mb-2">Error al cargar citas</p>
          <p className="text-red-300/80 text-sm">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-white flex items-center gap-3">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-zinc-400">Cargando citas...</span>
      </div>
    )
  }

  return (
    <div className="p-6 text-white space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tight">Citas</h1>
          <p className="text-zinc-400 mt-2">Gestión de citas y calendario</p>
        </div>
        <button
          onClick={() => openNewForm()}
          className="bg-white text-black px-6 py-3 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all duration-200 flex items-center gap-2"
        >
          <Plus size={16} />
          Nueva cita
        </button>
      </div>

      {/* CALENDAR + LIST */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CALENDAR */}

        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={goToday}
              className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Hoy
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center text-xs text-zinc-500 font-medium py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd")
              const dayCitas = citasByDate.get(dateStr) || []
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = dateStr === selectedDate
              const today = isToday(day)

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr)
                    setShowForm(false)
                  }}
                  className={`
                    relative min-h-[80px] p-2 border border-zinc-800/50
                    transition-colors duration-150 cursor-pointer text-left
                    ${isSelected ? "bg-zinc-700/50 border-zinc-600" : "hover:bg-zinc-800/30"}
                    ${!isCurrentMonth ? "opacity-30" : ""}
                  `}
                >
                  <span className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                    ${today ? "bg-white text-black font-bold" : "text-zinc-300"}
                  `}>
                    {format(day, "d")}
                  </span>

                  {dayCitas.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayCitas.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${
                            c.estado === "cancelada"
                              ? "bg-red-500/30 text-red-300"
                              : c.estado === "completada"
                              ? "bg-green-500/30 text-green-300"
                              : "bg-blue-500/30 text-blue-300"
                          }`}
                        >
                          {c.hora.slice(0, 5)} {c.pacienteNombre}
                        </div>
                      ))}
                      {dayCitas.length > 3 && (
                        <div className="text-[10px] text-zinc-500 px-1">
                          +{dayCitas.length - 3} más
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* SELECTED DAY DETAIL */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">

          {showForm ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingId ? "Editar cita" : "Nueva cita"}
                </h2>
                <button
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="text-zinc-500 hover:text-white text-sm cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Paciente *</label>
                    <input
                    value={formPacienteNombre}
                    onChange={(e) => setFormPacienteNombre(e.target.value)}
                    placeholder="Nombre del paciente"
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-white outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Teléfono</label>
                    <input
                    value={formPacienteTelefono}
                    onChange={(e) => setFormPacienteTelefono(e.target.value)}
                    placeholder="+52 555 123 4567"
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-white outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={formFecha}
                      onChange={(e) => setFormFecha(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-white outline-none focus:border-zinc-600 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Hora *</label>
                    <input
                      type="time"
                      value={formHora}
                      onChange={(e) => setFormHora(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-white outline-none focus:border-zinc-600 [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Duración (min)</label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={formDuracion}
                      onChange={(e) => setFormDuracion(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-white outline-none focus:border-zinc-600 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Precio $</label>
                    <input
                      type="number"
                      min={0}
                      value={formPrecio || ""}
                      onChange={(e) => setFormPrecio(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-white outline-none focus:border-zinc-600 [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Estado</label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value as CitaStatus)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-zinc-600 text-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Notas</label>
                  <textarea
                    value={formNotas}
                    onChange={(e) => setFormNotas(e.target.value)}
                    rows={2}
                    placeholder="Notas opcionales..."
                    className="w-full bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl text-sm text-white outline-none focus:border-zinc-600 resize-none"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-white text-black py-3 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {saving ? "Guardando..." : editingId ? "Actualizar cita" : "Crear cita"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {format(parse(selectedDate, "yyyy-MM-dd", new Date()), "d 'de' MMMM", { locale: es })}
                </h2>
                <button
                  onClick={() => openNewForm()}
                  className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  Agregar
                </button>
              </div>

              {selectedCitas.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <CalendarIcon size={40} className="mx-auto mb-3 opacity-50" />
                  <p>Sin citas para este día</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCitas.map((c) => (
                    <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-white">{c.pacienteNombre}</h3>
                          <p className="text-zinc-400 text-sm mt-0.5">{c.pacienteTelefono}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${STATUS_STYLES[c.estado].class}`}>
                          {STATUS_STYLES[c.estado].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {c.hora.slice(0, 5)} ({c.duracion} min)
                        </span>
                        {c.precio > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={12} />
                            ${c.precio}
                          </span>
                        )}
                      </div>
                      {c.notas && (
                        <p className="text-zinc-500 text-xs mt-2">{c.notas}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEdit(c)}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="bg-red-600 hover:bg-red-500 py-2 px-3 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-400 text-sm">Total citas</p>
          <p className="text-3xl font-bold mt-1">{citas.length}</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-2xl p-4">
          <p className="text-yellow-400 text-sm">Pendientes</p>
          <p className="text-3xl font-bold mt-1">{citas.filter((c) => c.estado === "pendiente").length}</p>
        </div>
        <div className="bg-green-900/20 border border-green-800/30 rounded-2xl p-4">
          <p className="text-green-400 text-sm">Completadas</p>
          <p className="text-3xl font-bold mt-1">{citas.filter((c) => c.estado === "completada").length}</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-2xl p-4">
          <p className="text-blue-400 text-sm">Hoy</p>
          <p className="text-3xl font-bold mt-1">
            {citas.filter((c) => c.fecha === format(new Date(), "yyyy-MM-dd")).length}
          </p>
        </div>
      </div>

    </div>
  )
}
