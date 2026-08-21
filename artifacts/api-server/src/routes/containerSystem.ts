import { Router } from "express";
import { and, desc, eq, like } from "drizzle-orm";
import { db, containerSystemAuditTable, containerSystemRecordsTable, serviceRequestsTable } from "@workspace/db";
import type { AdminRequest } from "../middleware/adminAuth";

const router = Router();
const supportedKinds = [
  "customer", "container_type", "container", "container_asset", "vehicle", "driver",
  "contract", "contract_line", "container_movement", "ledger_entry", "receipt", "payment",
  "expense", "deposit", "bank_deposit", "maintenance", "alert", "setting",
  "branch", "employee", "permit", "appointment", "warehouse", "treasury", "transfer",
  "invoice", "invoice_return", "category", "category_size", "tax", "commission",
  "oil_change", "salary_advance", "salary_payment", "fuel_expense", "daily_expense",
] as const;
type RecordKind = typeof supportedKinds[number];

function parsePayload(payload: string): Record<string, unknown> {
  try {
    const value = JSON.parse(payload);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function formatRecord(row: typeof containerSystemRecordsTable.$inferSelect) {
  return { ...row, payload: parsePayload(row.payload) };
}

function canManage(req: AdminRequest, kind: string): boolean {
  if (req.adminRole === "admin" || req.adminRole === "manager") return true;
  const permissions = req.adminPermissions as string[];
  return permissions.includes("container_system") || permissions.includes(`container_system_${kind}`);
}

function referenceFor(kind: string, payload: Record<string, unknown>, nextId: number): string {
  const prefix: Record<string, string> = {
    customer: "CUS", container_type: "CT", container_asset: "CONT", vehicle: "CAR",
    driver: "DRV", contract: "RNT", receipt: "RCV", payment: "PAY", expense: "EXP",
    bank_deposit: "DEP", maintenance: "MNT",
    branch: "BRN", employee: "EMP", permit: "PRM", appointment: "APT", invoice: "INV",
    treasury: "TRS", transfer: "TRF", tax: "TAX", commission: "COM",
  };
  return String(payload.reference || payload.code || `${prefix[kind] ?? "REC"}-${String(nextId).padStart(5, "0")}`);
}

function normalizeContractPayload(payload: Record<string, unknown>) {
  const next = { ...payload };
  const amount = Number(next.amount ?? 0);
  const taxRate = Number(next.taxRate ?? 15);
  if (Number.isFinite(amount) && Number.isFinite(taxRate)) {
    next.taxAmount = Math.round(amount * taxRate / 100 * 100) / 100;
    next.total = Math.round((amount + Number(next.taxAmount)) * 100) / 100;
  }
  return next;
}

const MOVEMENT_STATUS_BY_TYPE: Record<string, string> = {
  delivery: "rented",
  deliver: "rented",
  "تسليم": "rented",
  replacement: "in_transit",
  swap: "in_transit",
  "تبديل": "in_transit",
  "تبديل حاوية": "in_transit",
  unloading: "in_transit",
  emptying: "in_transit",
  "تفريغ": "in_transit",
  withdrawal: "in_transit",
  withdraw: "in_transit",
  "سحب": "in_transit",
  return: "available",
  returned: "available",
  "استرجاع": "available",
  maintenance: "maintenance",
  "صيانة": "maintenance",
};

function movementStatus(movementType: string) {
  const normalized = movementType.trim().toLowerCase();
  return MOVEMENT_STATUS_BY_TYPE[normalized] ?? null;
}

function assetCodeOf(payload: Record<string, unknown>) {
  return String(payload.assetCode ?? payload.code ?? "").trim();
}

function canonicalAssetStatus(value: unknown, fallback: string) {
  const status = String(value ?? "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    "متاح": "available",
    "متاحة": "available",
    "جاهز": "available",
    "جاهزة": "available",
    "مؤجر": "rented",
    "مؤجرة": "rented",
    "لدى العميل": "rented",
    "في الطريق": "in_transit",
    "تحت الفحص": "inspection",
    "صيانة": "maintenance",
    "في الصيانة": "maintenance",
    "تالف": "damaged",
    "تالفة": "damaged",
    "مفقود": "lost",
    "مفقودة": "lost",
    "خارج الخدمة": "out_of_service",
  };
  return aliases[status] ?? (status || fallback);
}

async function findAssetByCode(containerCode: string) {
  const normalizedCode = containerCode.trim();
  if (!normalizedCode) return null;
  const records = await db.select().from(containerSystemRecordsTable);
  return records.find(record =>
    ["container", "container_asset"].includes(record.kind) &&
    record.status !== "archived" &&
    assetCodeOf(parsePayload(record.payload)) === normalizedCode
  ) ?? null;
}

async function hasDuplicateAssetCode(containerCode: string, ignoredId?: number) {
  const normalizedCode = containerCode.trim();
  if (!normalizedCode) return false;
  const records = await db.select().from(containerSystemRecordsTable);
  return records.some(record =>
    ["container", "container_asset"].includes(record.kind) &&
    record.status !== "archived" &&
    record.id !== ignoredId &&
    assetCodeOf(parsePayload(record.payload)) === normalizedCode
  );
}

async function validateContractPayload(payload: Record<string, unknown>, ignoredId?: number) {
  const startDate = String(payload.startDate ?? "").trim();
  const endDate = String(payload.endDate ?? "").trim();
  const amount = Number(payload.amount ?? 0);
  const lifecycleStatus = String(payload.status ?? "active").trim().toLowerCase();
  if (startDate && !Number.isFinite(Date.parse(startDate))) throw new Error("تاريخ بداية العقد غير صحيح");
  if (endDate && !Number.isFinite(Date.parse(endDate))) throw new Error("تاريخ نهاية العقد غير صحيح");
  if (startDate && endDate && Date.parse(endDate) < Date.parse(startDate)) {
    throw new Error("نهاية العقد يجب أن تكون بعد بدايته");
  }
  if (!Number.isFinite(amount) || amount < 0) throw new Error("قيمة العقد يجب أن تكون رقمًا موجبًا");
  const containerCode = String(payload.containerCode ?? "").trim();
  if (["active", "issued", "scheduled", "delivered"].includes(lifecycleStatus) && !containerCode) {
    throw new Error("العقد التشغيلي يجب أن يرتبط بحاوية");
  }
  if (containerCode && !(await findAssetByCode(containerCode))) {
    throw new Error("الحاوية المرتبطة بالعقد غير موجودة");
  }
  if (await hasOverlappingContract(payload, ignoredId)) {
    throw new Error("الحاوية مرتبطة بعقد آخر خلال نفس الفترة");
  }
}

async function validateFinancialPayload(kind: string, payload: Record<string, unknown>) {
  if (["payment", "receipt", "expense", "deposit", "bank_deposit", "invoice", "invoice_return"].includes(kind)) {
    const amount = Number(payload.amount ?? payload.total ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("القيمة المالية يجب أن تكون أكبر من صفر");
  }
  const contractNumber = String(payload.contractNumber ?? "").trim();
  if (contractNumber && ["payment", "receipt", "invoice", "invoice_return"].includes(kind)) {
    const records = await db.select().from(containerSystemRecordsTable);
    const contract = records.find(record =>
      record.kind === "contract" &&
      record.status !== "archived" &&
      String(parsePayload(record.payload).contractNumber ?? record.reference).trim() === contractNumber
    );
    if (!contract) throw new Error("العقد المرتبط بالمستند المالي غير موجود");
  }
}

async function hasOverlappingContract(payload: Record<string, unknown>, ignoredId?: number) {
  const containerCode = String(payload.containerCode ?? "").trim();
  const start = Date.parse(String(payload.startDate ?? ""));
  const end = Date.parse(String(payload.endDate ?? ""));
  if (!containerCode || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  const existing = await db.select().from(containerSystemRecordsTable);
  return existing.some(record => {
    if (record.kind !== "contract" || record.status === "archived" || record.id === ignoredId) return false;
    const current = parsePayload(record.payload);
    if (String(current.containerCode ?? "") !== containerCode) return false;
    const currentStart = Date.parse(String(current.startDate ?? ""));
    const currentEnd = Date.parse(String(current.endDate ?? ""));
    return ["active", "issued", "scheduled", "delivered"].includes(record.status) &&
      Number.isFinite(currentStart) && Number.isFinite(currentEnd) &&
      start <= currentEnd && end >= currentStart;
  });
}

async function syncMovement(payload: Record<string, unknown>, actorId: number | null) {
  const movementType = String(payload.movementType ?? "").toLowerCase();
  const nextStatus = movementStatus(movementType);
  if (!nextStatus) throw new Error("نوع حركة الحاوية غير مدعوم");
  const asset = await findAssetByCode(String(payload.containerCode ?? ""));
  if (!asset) throw new Error("الحاوية المرتبطة بالحركة غير موجودة");
  const before = asset.payload;
  const beforePayload = parsePayload(before);
  const nextPayload = { ...beforePayload, location: payload.location ?? beforePayload.location };
  await db.update(containerSystemRecordsTable).set({
    status: nextStatus, payload: JSON.stringify(nextPayload), updatedAt: new Date().toISOString(),
  }).where(eq(containerSystemRecordsTable.id, asset.id));
  await db.insert(containerSystemAuditTable).values({
    recordId: asset.id, kind: asset.kind, action: "movement_sync",
    beforePayload: before, afterPayload: JSON.stringify(nextPayload), actorId,
  });
}

async function linkContractToRequest(payload: Record<string, unknown>, contractId: number, actorId: number | null) {
  const requestId = Number(payload.requestId ?? payload.serviceRequestId ?? 0);
  if (!Number.isInteger(requestId) || requestId <= 0) return;
  const request = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, requestId)).get();
  if (!request) throw new Error("الطلب المرتبط بالعقد غير موجود");
  const allRecords = await db.select().from(containerSystemRecordsTable);
  const payloadOf = (record: typeof allRecords[number]) => parsePayload(record.payload);
  const customerName = String(payload.customerName ?? request.clientName ?? "").trim();
  const customerPhone = String(payload.customerPhone ?? request.phone ?? "").replace(/\D/g, "");
  const customer = allRecords.find(record => {
    if (record.kind !== "customer" || record.status === "archived") return false;
    const current = payloadOf(record);
    const currentPhone = String(current.phone ?? "").replace(/\D/g, "");
    return (customerName && String(current.name ?? "").trim() === customerName) ||
      (customerPhone && currentPhone && currentPhone === customerPhone);
  });
  let customerId = Number(payload.customerRecordId ?? customer?.id ?? 0) || null;
  if (!customer && customerName) {
    const [createdCustomer] = await db.insert(containerSystemRecordsTable).values({
      kind: "customer",
      status: "active",
      reference: referenceFor("customer", { name: customerName }, Date.now()),
      payload: JSON.stringify({
        name: customerName,
        phone: customerPhone || request.phone,
        email: payload.customerEmail ?? request.email ?? "",
        city: payload.city ?? "الرياض",
        source: "service_request",
        sourceRequestId: request.id,
      }),
      createdBy: actorId,
    }).returning();
    customerId = createdCustomer.id;
    await db.insert(containerSystemAuditTable).values({
      recordId: createdCustomer.id,
      kind: "customer",
      action: "auto_create_from_request",
      afterPayload: createdCustomer.payload,
      actorId,
    });
  }
  const containerCode = String(payload.containerCode ?? "").trim();
  const container = allRecords.find(record => {
    if (!["container", "container_asset"].includes(record.kind) || record.status === "archived") return false;
    const current = payloadOf(record);
    return containerCode && String(current.assetCode ?? current.code ?? "").trim() === containerCode;
  });
  await db.update(serviceRequestsTable).set({
    customerRecordId: customerId,
    containerRecordId: Number(payload.containerRecordId ?? container?.id ?? 0) || null,
    contractRecordId: contractId,
    status: ["draft", "cancelled"].includes(String(payload.status ?? "")) ? request.status : "in_progress",
    adminNotes: `${request.adminNotes ?? ""}\nمرتبط بعقد الحاويات ${contractId}`.trim(),
    updatedAt: new Date().toISOString(),
  }).where(eq(serviceRequestsTable.id, requestId));
  await db.insert(containerSystemAuditTable).values({
    recordId: contractId, kind: "contract", action: "request_link",
    afterPayload: JSON.stringify({ requestId, customerRecordId: payload.customerRecordId ?? null, containerRecordId: payload.containerRecordId ?? null }),
    actorId,
  });
}

router.get("/admin/container-system", async (req, res) => {
  const rows = await db.select().from(containerSystemRecordsTable).orderBy(desc(containerSystemRecordsTable.updatedAt));
  const records = rows.map(formatRecord);
  const count = (kind: string, status?: string) => records.filter(r => r.kind === kind && (!status || r.status === status)).length;
  const paymentsByContract = new Map<string, number>();
  records.filter(r => r.kind === "payment" || r.kind === "receipt").forEach(r => {
    const contractNumber = String((r.payload as Record<string, unknown>).contractNumber ?? "");
    if (contractNumber) paymentsByContract.set(contractNumber, (paymentsByContract.get(contractNumber) ?? 0) + Number((r.payload as Record<string, unknown>).amount ?? 0));
  });
  const contracts = records.filter(r => r.kind === "contract").map(r => {
    const payload = r.payload as Record<string, unknown>;
    const total = Number(payload.total ?? payload.amount ?? 0);
    const paid = paymentsByContract.get(String(payload.contractNumber ?? "")) ?? 0;
    return { ...r, payload: { ...payload, paid, remaining: Math.max(total - paid, 0) } };
  });
  const activeContracts = contracts.filter(r => ["active", "issued", "scheduled", "delivered"].includes(r.status));
  const expiringContracts = activeContracts.filter(r => {
    const end = String((r.payload as Record<string, unknown>).endDate ?? "");
    if (!end) return false;
    const endTime = Date.parse(end);
    return Number.isFinite(endTime) && endTime <= Date.now() + 3 * 86400000;
  });
  const debt = contracts.reduce((sum, r) => sum + Number((r.payload as Record<string, unknown>).remaining ?? 0), 0);
  const contractValue = contracts.reduce((sum, r) => sum + Number((r.payload as Record<string, unknown>).total ?? 0), 0);
  const expenses = records.filter(r => r.kind === "expense").reduce((sum, r) => sum + Number((r.payload as Record<string, unknown>).amount ?? 0), 0);
  const maintenanceCost = records.filter(r => r.kind === "maintenance").reduce((sum, r) => sum + Number((r.payload as Record<string, unknown>).cost ?? 0), 0);
  const fleetCount = records.filter(r => r.kind === "vehicle").length;
  const rentedCount = records.filter(r => ["container", "container_asset"].includes(r.kind) && r.status === "rented").length;
  return res.json({
    summary: {
      customers: count("customer"),
      containers: records.filter(r => ["container", "container_asset"].includes(r.kind)).length,
      availableContainers: records.filter(r => ["container", "container_asset"].includes(r.kind) && r.status === "available").length,
      rentedContainers: records.filter(r => ["container", "container_asset"].includes(r.kind) && r.status === "rented").length,
      activeContracts: activeContracts.length,
      containerMovements: count("container_movement"),
      openLedgerEntries: records.filter(r => r.kind === "ledger_entry" && r.status === "open").length,
      collected: Array.from(paymentsByContract.values()).reduce((sum, amount) => sum + amount, 0),
      expiringContracts: expiringContracts.length,
      debt,
      contractValue,
      expenses,
      maintenanceCost,
      fleetUtilization: fleetCount ? Math.round(records.filter(r => r.kind === "vehicle" && r.status === "busy").length / fleetCount * 100) : 0,
      containerUtilization: records.filter(r => ["container", "container_asset"].includes(r.kind)).length
        ? Math.round(rentedCount / records.filter(r => ["container", "container_asset"].includes(r.kind)).length * 100) : 0,
      vehicles: count("vehicle"),
      vehiclesReady: records.filter(r => r.kind === "vehicle" && r.status === "available").length,
      maintenanceDue: records.filter(r => r.kind === "maintenance" && ["due", "overdue"].includes(r.status)).length,
    },
    records: records.map(r => contracts.find(c => c.id === r.id) ?? r),
    expiringContracts,
    recent: records.slice(0, 12),
  });
});

router.get("/admin/container-system/records", async (req, res) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const filters = [];
  if (kind) filters.push(eq(containerSystemRecordsTable.kind, kind));
  if (status) filters.push(eq(containerSystemRecordsTable.status, status));
  if (search) filters.push(like(containerSystemRecordsTable.payload, `%${search}%`));
  const rows = await db.select().from(containerSystemRecordsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(containerSystemRecordsTable.updatedAt));
  return res.json(rows.map(formatRecord));
});

router.post("/admin/container-system/records", async (req, res) => {
  const adminReq = req as unknown as AdminRequest;
  const { kind, status = "active", payload = {} } = req.body as {
    kind?: string; status?: string; payload?: Record<string, unknown>;
  };
  if (!kind || !supportedKinds.includes(kind as RecordKind)) {
    return res.status(400).json({ error: "نوع السجل غير مدعوم" });
  }
  if (!canManage(adminReq, kind)) return res.status(403).json({ error: "ليس لديك صلاحية لهذه العملية" });
  if (!payload || typeof payload !== "object") return res.status(400).json({ error: "بيانات السجل غير صالحة" });
  if (kind === "contract") {
    Object.assign(payload, normalizeContractPayload(payload));
    const amount = Number(payload.amount ?? 0);
    const minimumPrice = Number(payload.minimumPrice ?? 0);
    const approved = ["true", "1", "yes", "نعم"].includes(String(payload.minimumPriceApproved ?? "").toLowerCase());
    if (minimumPrice > 0 && amount < minimumPrice && !approved) {
      return res.status(422).json({ error: "قيمة العقد أقل من الحد الأدنى وتتطلب استثناءً معتمداً" });
    }
    const containerCode = String(payload.containerCode ?? "").trim();
    if (containerCode) {
      if (await hasOverlappingContract(payload)) return res.status(409).json({ error: "الحاوية مرتبطة بعقد آخر خلال نفس الفترة" });
    }
    if (payload.requestId !== undefined && Number(payload.requestId) <= 0) {
      return res.status(422).json({ error: "رقم الطلب المرتبط غير صحيح" });
    }
    try {
      await validateContractPayload(payload);
    } catch (error) {
      return res.status(422).json({ error: error instanceof Error ? error.message : "بيانات العقد غير صحيحة" });
    }
  }
  if (kind === "container_movement") {
    const movementType = String(payload.movementType ?? "").trim();
    const containerCode = String(payload.containerCode ?? "").trim();
    if (!containerCode || !movementType) return res.status(422).json({ error: "رقم الحاوية ونوع الحركة مطلوبان" });
    if (!movementStatus(movementType)) return res.status(422).json({ error: "نوع حركة الحاوية غير مدعوم" });
    const asset = await findAssetByCode(containerCode);
    if (!asset) return res.status(422).json({ error: "الحاوية المرتبطة بالحركة غير موجودة" });
  }
  if (kind === "container" || kind === "container_asset") {
    const assetCode = assetCodeOf(payload);
    if (!assetCode) return res.status(422).json({ error: "رقم أصل الحاوية مطلوب" });
    if (await hasDuplicateAssetCode(assetCode)) return res.status(409).json({ error: "رقم أصل الحاوية مستخدم مسبقًا" });
  }
  try {
    await validateFinancialPayload(kind, payload);
  } catch (error) {
    return res.status(422).json({ error: error instanceof Error ? error.message : "بيانات مالية غير صحيحة" });
  }
  const normalizedStatus = kind === "container" || kind === "container_asset"
    ? canonicalAssetStatus(payload.status, String(status))
    : String(status);
  const [created] = await db.insert(containerSystemRecordsTable).values({
    kind,
    status: normalizedStatus,
    reference: referenceFor(kind, payload, Date.now()),
    payload: JSON.stringify(payload),
    createdBy: adminReq.adminId,
  }).returning();
  await db.insert(containerSystemAuditTable).values({
    recordId: created.id, kind, action: "create", afterPayload: created.payload, actorId: adminReq.adminId,
  });
   if (kind === "container_movement") {
     try {
       await syncMovement(payload, adminReq.adminId);
     } catch (error) {
       await db.update(containerSystemRecordsTable).set({ status: "archived", updatedAt: new Date().toISOString() }).where(eq(containerSystemRecordsTable.id, created.id));
       return res.status(422).json({ error: error instanceof Error ? error.message : "تعذر مزامنة حركة الحاوية" });
     }
   }
  if (kind === "contract") {
    try {
      await linkContractToRequest(payload, created.id, adminReq.adminId);
    } catch (error) {
      await db.update(containerSystemRecordsTable).set({ status: "archived", updatedAt: new Date().toISOString() }).where(eq(containerSystemRecordsTable.id, created.id));
      return res.status(422).json({ error: error instanceof Error ? error.message : "تعذر ربط العقد بالطلب" });
    }
  }
   if (["payment", "receipt", "expense", "deposit", "bank_deposit"].includes(kind)) {
    await db.insert(containerSystemRecordsTable).values({
      kind: "ledger_entry",
      status: "posted",
      reference: `LED-${created.id}`,
      payload: JSON.stringify({
        sourceKind: kind,
        sourceId: created.id,
        contractNumber: payload.contractNumber ?? "",
        customerName: payload.customerName ?? "",
        amount: Number(payload.amount ?? 0),
        direction: kind === "expense" ? "debit" : "credit",
        date: payload.date ?? new Date().toISOString().slice(0, 10),
      }),
      createdBy: adminReq.adminId,
    });
  }
  return res.status(201).json(formatRecord(created));
});

router.patch("/admin/container-system/records/:id", async (req, res) => {
  const adminReq = req as unknown as AdminRequest;
  const id = Number(req.params.id);
  const current = await db.select().from(containerSystemRecordsTable).where(eq(containerSystemRecordsTable.id, id)).get();
  if (!current) return res.status(404).json({ error: "السجل غير موجود" });
  if (!canManage(adminReq, current.kind)) return res.status(403).json({ error: "ليس لديك صلاحية لهذه العملية" });
  const body = req.body as { status?: string; payload?: Record<string, unknown> };
  const nextPayload = body.payload ? { ...parsePayload(current.payload), ...body.payload } : parsePayload(current.payload);
  if (current.kind === "contract") {
    Object.assign(nextPayload, normalizeContractPayload(nextPayload));
    const amount = Number(nextPayload.amount ?? 0);
    const minimumPrice = Number(nextPayload.minimumPrice ?? 0);
    const approved = ["true", "1", "yes", "نعم"].includes(String(nextPayload.minimumPriceApproved ?? "").toLowerCase());
    if (minimumPrice > 0 && amount < minimumPrice && !approved) {
      return res.status(422).json({ error: "قيمة العقد أقل من الحد الأدنى وتتطلب استثناءً معتمداً" });
    }
    try {
      await validateContractPayload(nextPayload, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "بيانات العقد غير صحيحة";
      return res.status(message.includes("مرتبطة بعقد") ? 409 : 422).json({ error: message });
    }
  }
  if (current.kind === "container_movement" &&
    (!String(nextPayload.containerCode ?? "").trim() || !String(nextPayload.movementType ?? "").trim())) {
    return res.status(422).json({ error: "رقم الحاوية ونوع الحركة مطلوبان" });
  }
  if (current.kind === "container_movement" && !movementStatus(String(nextPayload.movementType ?? ""))) {
    return res.status(422).json({ error: "نوع حركة الحاوية غير مدعوم" });
  }
  if (current.kind === "container_movement") {
    const asset = await findAssetByCode(String(nextPayload.containerCode ?? ""));
    if (!asset) return res.status(422).json({ error: "الحاوية المرتبطة بالحركة غير موجودة" });
  }
  if (current.kind === "container" || current.kind === "container_asset") {
    const assetCode = assetCodeOf(nextPayload);
    if (!assetCode) return res.status(422).json({ error: "رقم أصل الحاوية مطلوب" });
    if (await hasDuplicateAssetCode(assetCode, id)) return res.status(409).json({ error: "رقم أصل الحاوية مستخدم مسبقًا" });
  }
  try {
    await validateFinancialPayload(current.kind, nextPayload);
  } catch (error) {
    return res.status(422).json({ error: error instanceof Error ? error.message : "بيانات مالية غير صحيحة" });
  }
  const nextStatus = current.kind === "container" || current.kind === "container_asset"
    ? canonicalAssetStatus(nextPayload.status, String(body.status ?? current.status))
    : body.status ?? current.status;
  const [updated] = await db.update(containerSystemRecordsTable).set({
    status: nextStatus,
    payload: JSON.stringify(nextPayload),
    updatedAt: new Date().toISOString(),
  }).where(eq(containerSystemRecordsTable.id, id)).returning();
  await db.insert(containerSystemAuditTable).values({
    recordId: id, kind: current.kind, action: "update", beforePayload: current.payload,
    afterPayload: updated.payload, actorId: adminReq.adminId,
  });
  if (current.kind === "container_movement") await syncMovement(nextPayload, adminReq.adminId);
  if (current.kind === "contract" && nextPayload.requestId) {
    try {
      await linkContractToRequest(nextPayload, id, adminReq.adminId);
    } catch (error) {
      return res.status(422).json({ error: error instanceof Error ? error.message : "تعذر تحديث ربط الطلب" });
    }
  }
  return res.json(formatRecord(updated));
});

router.delete("/admin/container-system/records/:id", async (req, res) => {
  const adminReq = req as unknown as AdminRequest;
  const id = Number(req.params.id);
  const current = await db.select().from(containerSystemRecordsTable).where(eq(containerSystemRecordsTable.id, id)).get();
  if (!current) return res.status(404).json({ error: "السجل غير موجود" });
  if (adminReq.adminRole !== "admin" && adminReq.adminRole !== "manager") {
    return res.status(403).json({ error: "حذف السجلات يتطلب صلاحية المدير" });
  }
  await db.update(containerSystemRecordsTable).set({ status: "archived", updatedAt: new Date().toISOString() })
    .where(eq(containerSystemRecordsTable.id, id));
  await db.insert(containerSystemAuditTable).values({
    recordId: id, kind: current.kind, action: "archive", beforePayload: current.payload, actorId: adminReq.adminId,
  });
  return res.status(204).send();
});

router.get("/admin/container-system/audit", async (_req, res) => {
  const rows = await db.select().from(containerSystemAuditTable)
    .orderBy(desc(containerSystemAuditTable.createdAt)).limit(100);
  return res.json(rows);
});

export default router;