import {
  doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, Timestamp,
  orderBy, where, limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Automation, AutomationExecution } from "@/lib/types"

const automationsPath = (companyId: string) =>
  collection(db, "companies", companyId, "automations")

const executionsPath = (companyId: string) =>
  collection(db, "companies", companyId, "automationExecutions")

export const automationsService = {
  subscribeAll(
    companyId: string,
    onData: (items: Automation[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const q = query(automationsPath(companyId), orderBy("createdAt", "desc"))
    getDocs(q)
      .then((snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Automation[]
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  subscribeExecutions(
    companyId: string,
    automationId: string,
    onData: (items: AutomationExecution[]) => void,
    maxResults: number = 50,
    onError?: (err: Error) => void,
  ): () => void {
    const q = query(
      executionsPath(companyId),
      where("automationId", "==", automationId),
      orderBy("startedAt", "desc"),
      limit(maxResults),
    )
    getDocs(q)
      .then((snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AutomationExecution[]
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  async getById(companyId: string, automationId: string): Promise<Automation | null> {
    const ref = doc(db, "companies", companyId, "automations", automationId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Automation
  },

  async getAll(companyId: string): Promise<Automation[]> {
    const q = query(automationsPath(companyId), orderBy("createdAt", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Automation[]
  },

  async create(
    companyId: string,
    data: Partial<Automation>,
  ): Promise<string> {
    const now = Timestamp.now()
    const docData = {
      name: data.name ?? "",
      description: data.description ?? null,
      enabled: data.enabled ?? true,
      trigger: data.trigger ?? { event: null, schedule: null, conditions: [] },
      actions: data.actions ?? [],
      lastTriggeredAt: null,
      executionCount: 0,
      createdBy: "",
      tags: [],
      companyId,
      createdAt: now,
      updatedAt: now,
    }
    const ref = await addDoc(automationsPath(companyId), docData)
    return ref.id
  },

  async update(
    companyId: string,
    automationId: string,
    data: Partial<Automation>,
  ): Promise<void> {
    const ref = doc(db, "companies", companyId, "automations", automationId)
    await updateDoc(ref, { ...data, updatedAt: Timestamp.now() })
  },

  async delete(companyId: string, automationId: string): Promise<void> {
    const ref = doc(db, "companies", companyId, "automations", automationId)
    await deleteDoc(ref)
  },
}
