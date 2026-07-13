"use client"

import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import type { BusinessType } from "@/lib/types"

export interface UseCompanyTypeReturn {
  businessType: BusinessType | null
  companyId: string | null
  loading: boolean
  error: string | null
}

export function useCompanyType(): UseCompanyTypeReturn {
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setLoading(false)
        return
      }

      try {
        const userData = await getUserCompany(u.uid)
        if (!userData) {
          setLoading(false)
          return
        }

        setCompanyId(userData.companyId)

        const companySnap = await getDoc(doc(db, "companies", userData.companyId))
        if (companySnap.exists()) {
          const data = companySnap.data()
          const bt = data.businessType as BusinessType | undefined

          if (bt && ["restaurante", "barberia", "odontologia", "otro"].includes(bt)) {
            setBusinessType(bt)
          } else if (data.settings?.businessType) {
            const st = data.settings.businessType as BusinessType
            if (["restaurante", "barberia", "odontologia", "otro"].includes(st)) {
              setBusinessType(st)
            } else {
              setBusinessType("otro")
            }
          } else {
            setBusinessType(null)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al obtener tipo de empresa")
      } finally {
        setLoading(false)
      }
    })

    return () => unsub()
  }, [])

  return { businessType, companyId, loading, error }
}
