import { Router } from "express";
import { and, desc, eq, like } from "drizzle-orm";
import { db, containerSystemAuditTable, containerSystemRecordsTable, serviceRequestsTable } from "@workspace/db";
import type { AdminRequest } from "../middleware/adminAuth";

const router = Router();
const supportedKinds = [
  "customer", "container_type", "container", "container_asset", "vehicle", "driver",
  "contract", "contract_line", "container_movement", "ledger_entry", "receipt", "payment",
  "expense", "deposit", "bank_deposit", "maintenance", "alert", "setting",
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
  const nextStatus = movementType.includes("استرجاع") || movementType.includes("return") ? "available"
    : movementType.includes("صيانة") || movementType.includes("maintenance") ? "maintenance" : "rented";
  const assets = await db.select().from(containerSystemRecordsTable);
  const asset = assets.find(record => {
    if (!["container", "container_asset"].includes(record.kind)) return false;
    const assetPayload = parsePayload(record.payload);
    return String(assetPayload.assetCode ?? assetPayload.code ?? "") === String(payload.containerCode ?? "");
  });
  if (!asset) return;
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
  const containerCode = String(payload.containerCode ?? "").trim();
  const container = allRecords.find(record => {
    if (!["container", "container_asset"].includes(record.kind) || record.status === "archived") return false;
    const current = payloadOf(record);
    return containerCode && String(current.assetCode ?? current.code ?? "").trim() === containerCode;
  });
  await db.update(serviceRequestsTable).set({
    customerRecordId: Number(payload.customerRecordId ?? customer?.id ?? 0) || null,
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
  }
  if (kind === "container_movement") {
    const movementType = String(payload.movementType ?? "").trim();
    const containerCode = String(payload.containerCode ?? "").trim();
    if (!containerCode || !movementType) return res.status(422).json({ error: "رقم الحاوية ونوع الحركة مطلوبان" });
  }
  const [created] = await db.insert(containerSystemRecordsTable).values({
    kind,
    status: String(status),
    reference: referenceFor(kind, payload, Date.now()),
    payload: JSON.stringify(payload),
    createdBy: adminReq.adminId,
  }).returning();
  await db.insert(containerSystemAuditTable).values({
    recordId: created.id, kind, action: "create", afterPayload: created.payload, actorId: adminReq.adminId,
  });
  if (kind === "container_movement") await syncMovement(payload, adminReq.adminId);
  if (kind === "contract") {
    try {
      await linkContractToRequest(payload, created.id, adminReq.adminId);
    } catch (error) {
      await db.update(containerSystemRecordsTable).set({ status: "archived", updatedAt: new Date().toISOString() }).where(eq(containerSystemRecordsTable.id, created.id));
      return res.status(422).json({ error: error instanceof Error ? error.message : "تعذر ربط العقد بالطلب" });
    }
  }
  if (["payment", "receipt", "expense", "deposit"].includes(kind)) {
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
    if (await hasOverlappingContract(nextPayload, id)) {
      return res.status(409).json({ error: "الحاوية مرتبطة بعقد آخر خلال نفس الفترة" });
    }
  }
  if (current.kind === "container_movement" &&
    (!String(nextPayload.containerCode ?? "").trim() || !String(nextPayload.movementType ?? "").trim())) {
    return res.status(422).json({ error: "رقم الحاوية ونوع الحركة مطلوبان" });
  }
  const [updated] = await db.update(containerSystemRecordsTable).set({
    status: body.status ?? current.status,
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