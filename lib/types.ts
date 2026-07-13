import type { Timestamp } from "firebase/firestore"

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// ============================================================================
// Base
// ============================================================================

export interface BaseDocument {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CompanyDocument extends BaseDocument {
  companyId: string
}

// ============================================================================
// 1. Jobs Collection
// ============================================================================

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

export type JobType =
  | "send_whatsapp"
  | "send_email"
  | "send_sms"
  | "process_webhook"
  | "run_action"
  | "evaluate_condition"
  | "schedule_reminder"
  | "generate_report"
  | "sync_contact"
  | "import_data"
  | "export_data"

export type JobPriority = "low" | "normal" | "high" | "critical"

export interface JobError {
  attempt: number
  message: string
  stack?: string
  timestamp: Timestamp
}

export interface Job extends CompanyDocument {
  type: JobType
  status: JobStatus
  priority: JobPriority

  scheduledAt: Timestamp | null
  startedAt: Timestamp | null
  completedAt: Timestamp | null
  duration: number | null

  attempts: number
  maxAttempts: number
  lastError: string | null
  errorStack: JobError[]

  payload: Record<string, unknown>
  result: Record<string, unknown> | null

  executedBy: string | null
  automationId: string | null
  group: string | null

  tags: string[]

  version: number
}

// ============================================================================
// 2. Customers (CRM v2)
// ============================================================================

export type CustomerStatus = "lead" | "active" | "vip" | "inactive" | "lost"

export type CustomerSource =
  | "walk_in"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "google"
  | "referral"
  | "landing"
  | "import"
  | "other"

export type ChurnRisk = "low" | "medium" | "high"

export type ContactMethod = "whatsapp" | "email" | "phone" | "sms"

export interface CustomerConsent {
  whatsapp: boolean
  email: boolean
  sms: boolean
  updatedAt: Timestamp
}

export interface Customer extends CompanyDocument {
  name: string
  phone: string
  email: string | null
  photoURL: string | null

  birthday: Timestamp | null

  totalSpent: number
  visitCount: number
  averageTicket: number
  lifetimeValue: number
  firstPurchaseAt: Timestamp | null
  lastPurchaseAt: Timestamp | null

  tags: string[]
  status: CustomerStatus
  source: CustomerSource | null

  consent: CustomerConsent
  preferredContactMethod: ContactMethod
  notes: string
  customFields: Record<string, unknown>

  referrerId: string | null
  churnRisk: ChurnRisk
  lastRating: number | null

  lastInteractionAt: Timestamp | null
  lastWhatsAppAt: Timestamp | null
  lastEmailAt: Timestamp | null
}

// ============================================================================
// 3. Sales v2
// ============================================================================

export type SaleStatus = "pending" | "completed" | "cancelled" | "refunded"

export type PaymentMethod = "cash" | "card" | "transfer" | "mercadopago" | "qr" | "other"

export type PaymentStatus = "pending" | "paid" | "refunded" | "partial"

export interface SaleItem {
  productId: string
  productName: string
  category: string
  quantity: number
  unitPrice: number
  discount: number
  tax: number
  subtotal: number
  total: number
}

export interface Sale extends CompanyDocument {
  customerId: string | null
  customerName: string | null
  customerPhone: string | null

  items: SaleItem[]

  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number

  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paidAt: Timestamp | null

  status: SaleStatus
  cancelledAt: Timestamp | null
  cancellationReason: string | null
  refundedAt: Timestamp | null

  sellerId: string | null
  notes: string | null
}

// ============================================================================
// 4. Automation Events
// ============================================================================

export type AutomationEventType =
  | "customer.created"
  | "customer.updated"
  | "customer.status_changed"
  | "customer.tag_added"
  | "customer.tag_removed"
  | "customer.visit_completed"
  | "customer.birthday"
  | "customer.inactive_detected"
  | "customer.churn_risk_changed"
  | "customer.consent_updated"
  | "customer.rating_submitted"
  | "sale.created"
  | "sale.completed"
  | "sale.cancelled"
  | "sale.refunded"
  | "sale.payment_received"
  | "sale.payment_failed"
  | "inventory.low_stock"
  | "inventory.out_of_stock"
  | "inventory.restocked"
  | "inventory.product_created"
  | "business.daily_summary"
  | "business.weekly_report"
  | "automation.trigger_matched"
  | "whatsapp.message.received"

export interface AutomationEvent {
  id: string
  companyId: string
  type: AutomationEventType
  data: Record<string, unknown>
  source: string
  timestamp: Timestamp
  correlationId: string | null
}

// ============================================================================
// 5. Automations (definitions)
// ============================================================================

export type AutomationConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in"
  | "not_in"

export interface AutomationCondition {
  field: string
  operator: AutomationConditionOperator
  value: unknown
}

export type AutomationActionType =
  | "send_whatsapp"
  | "send_email"
  | "send_sms"
  | "add_tag"
  | "remove_tag"
  | "change_status"
  | "create_sale"
  | "update_customer"
  | "webhook"
  | "delay"
  | "create_lead"

export interface AutomationAction {
  type: AutomationActionType
  config: Record<string, unknown>
  order: number
}

export interface AutomationTrigger {
  event: AutomationEventType | null
  schedule: string | null
  conditions: AutomationCondition[]
}

export interface Automation extends CompanyDocument {
  name: string
  description: string | null
  enabled: boolean
  trigger: AutomationTrigger
  actions: AutomationAction[]
  lastTriggeredAt: Timestamp | null
  executionCount: number
  createdBy: string
  tags: string[]
}

// ============================================================================
// 6. Automation Executions
// ============================================================================

export type AutomationExecutionStatus = "running" | "completed" | "failed" | "cancelled"

export interface AutomationExecution extends CompanyDocument {
  automationId: string
  triggerEvent: string
  status: AutomationExecutionStatus
  customerId: string | null
  saleId: string | null
  jobIds: string[]
  startedAt: Timestamp
  completedAt: Timestamp | null
  error: string | null
}

// ============================================================================
// 7. Inventory v2
// ============================================================================

export type InventoryMovementType = "in" | "out" | "adjustment" | "return"

export interface InventoryMovement {
  id: string
  productId: string
  type: InventoryMovementType
  quantity: number
  previousStock: number
  newStock: number
  reference: string | null
  createdBy: string | null
  createdAt: Timestamp
}

export interface Product extends CompanyDocument {
  name: string
  description: string | null
  category: string
  price: number
  cost: number | null
  stock: number
  stockMinimo: number
  sku: string | null
  barcode: string | null
  active: boolean
}

// ============================================================================
// 8. Company / Settings
// ============================================================================

export type BusinessType = "restaurante" | "barberia" | "odontologia" | "otro"

export interface WorkingHours {
  open: string
  close: string
}

export interface CompanySettings {
  businessName: string
  businessType: BusinessType
  phone: string
  email: string
  address: string | null
  timezone: string
  workingHours: Record<string, WorkingHours | null>
  whatsappBusinessId: string | null
  whatsappToken: string | null
  automationEnabled: boolean
  maxAutomations: number
}

// ============================================================================
// 9. User / Membership
// ============================================================================

export type UserRole = "admin" | "manager" | "staff" | "viewer"

export interface CompanyUser {
  id: string
  email: string
  name: string
  role: UserRole
  phone: string | null
  active: boolean
  createdAt: Timestamp
}

// ============================================================================
// 10. Leads / Citas (WhatsApp inbound)
// ============================================================================

export interface Lead extends CompanyDocument {
  name: string
  phone: string
  message: string | null
  source: string
  status: "new" | "contacted" | "converted" | "closed"
  customerId: string | null
  whatsappMessageId: string | null
  leadDate: string
  leadTime: string | null
}
