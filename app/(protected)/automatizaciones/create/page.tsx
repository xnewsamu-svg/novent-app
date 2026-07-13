"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { EditorLayout } from "@/src/components/workflow-editor"

export default function CreateAutomationPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return }
      const data = await getUserCompany(user.uid)
      if (data) {
        setCompanyId(data.companyId)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Cargando...
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        No se pudo determinar la empresa. Inicia sesión nuevamente.
      </div>
    )
  }

  return <EditorLayout companyId={companyId} workflowId={null} />
}
