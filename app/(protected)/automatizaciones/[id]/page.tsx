"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { EditorLayout } from "@/src/components/workflow-editor"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function AutomationEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [companyId, setCompanyId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return }
      const data = await getUserCompany(user.uid)
      if (data) {
        setCompanyId(data.companyId)
      } else {
        setError("No se pudo determinar la empresa")
      }
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !companyId) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">{error ?? "Error de autenticación"}</h1>
        <Button className="mt-4" onClick={() => router.push("/automatizaciones")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    )
  }

  return <EditorLayout companyId={companyId} workflowId={id} />
}
