import {
  doc, getDocs, addDoc, updateDoc, deleteDoc,
  collection, query, Timestamp,
  orderBy,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface CampaignRecord {
  id: string
  name: string
  message: string
  audience: string
  status: "draft" | "scheduled" | "sending" | "completed" | "cancelled"
  scheduledFor?: Timestamp | null
  total: number
  sent: number
  createdAt: Timestamp
  companyId: string
}

export interface TemplateRecord {
  id: string
  name: string
  message: string
  variables: string[]
  category: string
  status: "active" | "pending" | "rejected"
  createdAt: Timestamp
  companyId: string
}

const campaignsPath = (companyId: string) =>
  collection(db, "companies", companyId, "campaigns")

const templatesPath = (companyId: string) =>
  collection(db, "companies", companyId, "templates")

export const whatsappService = {
  subscribeCampaigns(
    companyId: string,
    onData: (items: CampaignRecord[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    getDocs(campaignsPath(companyId))
      .then((snap) => {
        const items: CampaignRecord[] = []
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as CampaignRecord))
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  subscribeTemplates(
    companyId: string,
    onData: (items: TemplateRecord[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    getDocs(templatesPath(companyId))
      .then((snap) => {
        const items: TemplateRecord[] = []
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as TemplateRecord))
        onData(items)
      })
      .catch((err) => onError?.(err as Error))
    return () => {}
  },

  async getCampaigns(companyId: string): Promise<CampaignRecord[]> {
    const snap = await getDocs(campaignsPath(companyId))
    const items: CampaignRecord[] = []
    snap.forEach((d) => items.push({ id: d.id, ...d.data() } as CampaignRecord))
    return items
  },

  async getTemplates(companyId: string): Promise<TemplateRecord[]> {
    const snap = await getDocs(templatesPath(companyId))
    const items: TemplateRecord[] = []
    snap.forEach((d) => items.push({ id: d.id, ...d.data() } as TemplateRecord))
    return items
  },

  async createTemplate(
    companyId: string,
    data: Partial<TemplateRecord>,
  ): Promise<string> {
    const payload = {
      name: data.name ?? "",
      message: data.message ?? "",
      variables: data.variables ?? [],
      category: data.category ?? "marketing",
      status: "active" as const,
      companyId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    const ref = await addDoc(templatesPath(companyId), payload)
    return ref.id
  },

  async updateTemplate(
    companyId: string,
    templateId: string,
    data: Partial<TemplateRecord>,
  ): Promise<void> {
    const ref = doc(db, "companies", companyId, "templates", templateId)
    await updateDoc(ref, { ...data, updatedAt: Timestamp.now() })
  },

  async deleteTemplate(companyId: string, templateId: string): Promise<void> {
    const ref = doc(db, "companies", companyId, "templates", templateId)
    await deleteDoc(ref)
  },
}
