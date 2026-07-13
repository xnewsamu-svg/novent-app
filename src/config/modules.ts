import type { BusinessType } from "@/lib/types"

export type ModuleId =
  | "dashboard"
  | "clientes"
  | "ventas"
  | "inventario"
  | "servicios"
  | "citas"
  | "whatsapp"
  | "automatizaciones"

export interface ModuleConfig {
  id: ModuleId
  name: string
  href: string
  icon: string
  children?: { name: string; href: string }[]
}

export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  ventas: "Ventas",
  inventario: "Inventario",
  servicios: "Servicios",
  citas: "Citas",
  whatsapp: "WhatsApp",
  automatizaciones: "Automatizaciones",
}

const WHATSAPP_CHILDREN = [
  { name: "Templates", href: "/whatsapp/templates" },
  { name: "Campañas", href: "/whatsapp/campaigns" },
]

export const MODULES_BY_TYPE: Record<BusinessType, ModuleConfig[]> = {
  restaurante: [
    { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: "📊" },
    { id: "clientes", name: "Clientes", href: "/clientes", icon: "👥" },
    { id: "ventas", name: "Ventas", href: "/ventas", icon: "💰" },
    { id: "inventario", name: "Inventario", href: "/inventario", icon: "📦" },
    { id: "whatsapp", name: "WhatsApp", href: "/whatsapp", icon: "💬", children: WHATSAPP_CHILDREN },
    { id: "automatizaciones", name: "Automatizaciones", href: "/automatizaciones", icon: "⚡" },
  ],
  barberia: [
    { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: "📊" },
    { id: "clientes", name: "Clientes", href: "/clientes", icon: "👥" },
    { id: "ventas", name: "Ventas", href: "/ventas", icon: "💰" },
    { id: "servicios", name: "Servicios", href: "/servicios", icon: "💇" },
    { id: "citas", name: "Citas", href: "/citas", icon: "📅" },
    { id: "whatsapp", name: "WhatsApp", href: "/whatsapp", icon: "💬", children: WHATSAPP_CHILDREN },
    { id: "automatizaciones", name: "Automatizaciones", href: "/automatizaciones", icon: "⚡" },
  ],
  odontologia: [
    { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: "📊" },
    { id: "clientes", name: "Clientes", href: "/clientes", icon: "👥" },
    { id: "ventas", name: "Ventas", href: "/ventas", icon: "💰" },
    { id: "citas", name: "Citas", href: "/citas", icon: "📅" },
    { id: "whatsapp", name: "WhatsApp", href: "/whatsapp", icon: "💬", children: WHATSAPP_CHILDREN },
    { id: "automatizaciones", name: "Automatizaciones", href: "/automatizaciones", icon: "⚡" },
  ],
  otro: [
    { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: "📊" },
    { id: "clientes", name: "Clientes", href: "/clientes", icon: "👥" },
    { id: "ventas", name: "Ventas", href: "/ventas", icon: "💰" },
    { id: "whatsapp", name: "WhatsApp", href: "/whatsapp", icon: "💬", children: WHATSAPP_CHILDREN },
    { id: "automatizaciones", name: "Automatizaciones", href: "/automatizaciones", icon: "⚡" },
  ],
}
