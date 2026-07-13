import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'

interface RateLimitConfig {
  maxPerMinute: number
  maxPerDay: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxPerMinute: 15,
  maxPerDay: 100,
}

export async function checkRateLimit(
  companyId: string,
  phoneNumber: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const now = new Date()
  const minuteKey = `${phoneNumber}_${formatMinute(now)}`
  const dayKey = `${phoneNumber}_${formatDay(now)}`

  const minuteDoc = adminDb
    .collection(`companies/${companyId}/rateLimits`)
    .doc(minuteKey)

  const dayDoc = adminDb
    .collection(`companies/${companyId}/rateLimits`)
    .doc(dayKey)

  const [minuteSnap, daySnap] = await Promise.all([
    minuteDoc.get(),
    dayDoc.get(),
  ])

  const minuteCount = minuteSnap.data()?.count || 0
  const dayCount = daySnap.data()?.count || 0

  const minuteRemaining = config.maxPerMinute - minuteCount
  const dayRemaining = config.maxPerDay - dayCount

  const allowed = minuteRemaining > 0 && dayRemaining > 0
  const remaining = Math.min(minuteRemaining, dayRemaining)

  const resetTime = new Date(now)
  resetTime.setSeconds(0)
  resetTime.setMilliseconds(0)

  if (minuteRemaining <= 0) {
    resetTime.setMinutes(now.getMinutes() + 1)
  } else if (dayRemaining <= 0) {
    resetTime.setDate(now.getDate() + 1)
    resetTime.setHours(0, 0, 0, 0)
  } else {
    resetTime.setMinutes(now.getMinutes() + 1)
  }

  return { allowed, remaining, resetTime }
}

export async function incrementRateLimit(
  companyId: string,
  phoneNumber: string,
): Promise<void> {
  const now = new Date()
  const minuteKey = `${phoneNumber}_${formatMinute(now)}`
  const dayKey = `${phoneNumber}_${formatDay(now)}`

  const batch = adminDb.batch()

  const minuteRef = adminDb
    .collection(`companies/${companyId}/rateLimits`)
    .doc(minuteKey)
  batch.set(
    minuteRef,
    { count: FieldValue.increment(1), createdAt: now },
    { merge: true },
  )

  const dayRef = adminDb
    .collection(`companies/${companyId}/rateLimits`)
    .doc(dayKey)
  batch.set(
    dayRef,
    { count: FieldValue.increment(1), createdAt: now },
    { merge: true },
  )

  await batch.commit()
}

function formatMinute(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}${mm}${dd}_${hh}${mi}`
}

function formatDay(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export async function cleanupRateLimits(
  companyId: string,
  daysToKeep: number = 7,
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysToKeep)

  const snapshot = await adminDb
    .collection(`companies/${companyId}/rateLimits`)
    .where('createdAt', '<', cutoff)
    .get()

  const batch = adminDb.batch()
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  await batch.commit()
  return snapshot.size
}
