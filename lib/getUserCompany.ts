import { doc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

export async function getUserCompany(uid: string) {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    console.log("User doc no existe en Firestore")
    return null
  }

  const data = snap.data()

  if (!data?.companyId) {
    console.log("User sin companyId")
    return null
  }

  return {
    companyId: data.companyId as string,
    nombre: data.nombre as string | undefined,
  }
}