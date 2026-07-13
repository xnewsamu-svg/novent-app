import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Todos los eventos que puede emitir el sistema.
 * Agrega nuevos eventos aquí a medida que crezca el motor.
 */
export type AutomationEventType =
  // Customer
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  // Sale
  | "sale.created"
  | "sale.completed"
  | "sale.cancelled"
  // Job
  | "job.created"
  | "job.completed"
  | "job.failed"
  // Automation
  | "automation.triggered"
  | "automation.execution.started"
  | "automation.execution.completed"
  | "automation.execution.failed"
  // Inventory
  | "inventory.low_stock"
  | "inventory.out_of_stock"
  | "inventory.product_created"
  // WhatsApp
  | "whatsapp.message.received"
  // Leads
  | "lead.created";

/** Identificadores del sistema que pueden originar eventos. */
export type AutomationEventSource =
  | "api"
  | "webhook"
  | "scheduler"
  | "automation_engine"
  | "manual";

/** Resultado de emitir un evento (Firestore doc ID). */
export interface EmitEventResult {
  eventId: string;
  correlationId: string;
}

/** Opciones opcionales para sobreescribir defaults. */
export interface EmitEventOptions {
  correlationId?: string;
  source?: AutomationEventSource;
}

// ---------------------------------------------------------------------------
// Payloads tipados por evento (ejemplos de los más comunes)
// ---------------------------------------------------------------------------

export interface CustomerCreatedData extends Record<string, unknown> {
  customerId: string;
  name: string;
  email: string;
  phone?: string;
}

export interface SaleCompletedData extends Record<string, unknown> {
  saleId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  lineItems: Array<{ productId: string; quantity: number; unitPrice: number }>;
}

// ---------------------------------------------------------------------------
// Core: emitEvent
// ---------------------------------------------------------------------------

/**
 * Emite un evento al sistema de automatizaciones de Novent.
 *
 * Envía el evento a la API route /api/events/emit, que:
 * 1. Almacena el evento en Firestore (companies/{companyId}/events)
 * 2. Evalúa las automatizaciones habilitadas para ese tipo de evento
 * 3. Crea los jobs necesarios para cada acción
 *
 * @param companyId  - ID de la empresa (se usa solo para logging; el servidor lo extrae del token)
 * @param type       - Tipo de evento (ver AutomationEventType).
 * @param data       - Payload específico del evento.
 * @param options    - Opciones opcionales (correlationId, source).
 *
 * @returns          - eventId y correlationId del evento creado.
 */
export async function emitEvent<
  TData extends Record<string, unknown> = Record<string, unknown>
>(
  _companyId: string,
  type: AutomationEventType,
  data: TData,
  options: EmitEventOptions = {}
): Promise<EmitEventResult> {
  const { correlationId = uuidv4(), source = "api" } = options;

  try {
    const response = await fetch("/api/events/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data, source, correlationId }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "Error desconocido");
      console.error(`[emitEvent] Error ${response.status}: ${err}`);
      return { eventId: "", correlationId };
    }

    const result = await response.json();

    return {
      eventId: result.eventId,
      correlationId,
    };
  } catch (error) {
    console.error(`[emitEvent] Error al emitir evento ${type}:`, error);
    return { eventId: "", correlationId };
  }
}

// ---------------------------------------------------------------------------
// Helpers tipados (DX mejorada para los eventos más frecuentes)
// ---------------------------------------------------------------------------

/**
 * Atajo fuertemente tipado para emitir customer.created.
 *
 * @example
 * await emitCustomerCreated("company_abc", {
 *   customerId: "cust_001",
 *   name: "Ana Gómez",
 *   email: "ana@example.com",
 * });
 */
export function emitCustomerCreated(
  companyId: string,
  data: CustomerCreatedData,
  options?: EmitEventOptions
): Promise<EmitEventResult> {
  return emitEvent<CustomerCreatedData>(
    companyId,
    "customer.created",
    data,
    options
  );
}

/**
 * Atajo fuertemente tipado para emitir sale.completed.
 *
 * @example
 * await emitSaleCompleted("company_abc", {
 *   saleId: "sale_099",
 *   customerId: "cust_001",
 *   totalAmount: 350_000,
 *   currency: "COP",
 *   lineItems: [{ productId: "prod_7", quantity: 2, unitPrice: 175_000 }],
 * });
 */
export function emitSaleCompleted(
  companyId: string,
  data: SaleCompletedData,
  options?: EmitEventOptions
): Promise<EmitEventResult> {
  return emitEvent<SaleCompletedData>(
    companyId,
    "sale.completed",
    data,
    options
  );
}