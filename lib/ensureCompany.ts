import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore"
import { db } from "./firebase"

export async function ensureCompany(uid: string, email: string) {
  const userRef = doc(db, "users", uid)
  const userSnap = await getDoc(userRef)

  // 1. si user no existe, crearlo
  if (!userSnap.exists()) {
    const newCompanyRef = await addDoc(collection(db, "companies"), {
      name: `Empresa de ${email}`,
      owner: uid,
      createdAt: new Date(),
    })

    await setDoc(userRef, {
      companyId: newCompanyRef.id,
      email,
    })

    return newCompanyRef.id
  }

  // 2. si user existe pero no tiene company
  const data = userSnap.data()

  if (!data?.companyId) {
    const newCompanyRef = await addDoc(collection(db, "companies"), {
      name: `Empresa de ${email}`,
      owner: uid,
      createdAt: new Date(),
    })

    await setDoc(userRef, {
      ...data,
      companyId: newCompanyRef.id,
    })

    return newCompanyRef.id
  }

  return data.companyId
}