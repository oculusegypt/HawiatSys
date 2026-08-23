import { db, containerSystemRecordsTable, serviceRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type ServiceRequest = typeof serviceRequestsTable.$inferSelect;

function parsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00966")) return `0${digits.slice(5)}`;
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  return digits;
}

/**
 * Makes every order source visible in Container Operations as a customer and
 * reusable customer site. This is intentionally idempotent for phone/address.
 */
export async function syncCustomerFromRequest(request: ServiceRequest) {
  const normalizedPhone = normalizePhone(request.phone);
  if (!normalizedPhone) return { request, customer: null, site: null };

  const records = await db.select().from(containerSystemRecordsTable);
  const customer = records.find((record) =>
    record.kind === "customer" &&
    record.status !== "archived" &&
    normalizePhone(String(parsePayload(record.payload).phone ?? "")) === normalizedPhone,
  );

  const existingPayload = customer ? parsePayload(customer.payload) : {};
  const customerPayload = {
    ...existingPayload,
    name: request.clientName || String(existingPayload.name ?? ""),
    phone: request.phone || String(existingPayload.phone ?? ""),
    email: request.email ?? String(existingPayload.email ?? ""),
    ...(customer ? { lastRequestId: request.id, updatedFrom: "service_request" } : {
      source: "service_request",
      firstRequestId: request.id,
    }),
  };

  const savedCustomer = customer
    ? (await db.update(containerSystemRecordsTable).set({
        payload: JSON.stringify(customerPayload),
        updatedAt: new Date().toISOString(),
      }).where(eq(containerSystemRecordsTable.id, customer.id)).returning())[0] ?? customer
    : (await db.insert(containerSystemRecordsTable).values({
        kind: "customer",
        status: "active",
        reference: `CUS-${String(request.id).padStart(5, "0")}`,
        payload: JSON.stringify(customerPayload),
      }).returning())[0];

  const location = String(request.location ?? "").trim();
  let site = null;
  if (location && location !== "غير محدد") {
    site = records.find((record) =>
      record.kind === "customer_site" &&
      record.status !== "archived" &&
      Number(parsePayload(record.payload).customerRecordId) === savedCustomer.id &&
      String(parsePayload(record.payload).address ?? parsePayload(record.payload).location ?? "").trim() === location,
    ) ?? null;

    if (!site) {
      site = (await db.insert(containerSystemRecordsTable).values({
        kind: "customer_site",
        status: "active",
        reference: `SITE-${String(request.id).padStart(5, "0")}`,
        payload: JSON.stringify({
          customerRecordId: savedCustomer.id,
          name: `${request.clientName} — عنوان الطلب #${request.id}`,
          address: location,
          location,
          source: "service_request",
          requestId: request.id,
          serviceType: request.serviceType,
        }),
      }).returning())[0];
    }
  }

  const [linkedRequest] = await db.update(serviceRequestsTable)
    .set({ customerRecordId: savedCustomer.id, updatedAt: new Date().toISOString() })
    .where(eq(serviceRequestsTable.id, request.id))
    .returning();

  return { request: linkedRequest ?? request, customer: savedCustomer, site };
}