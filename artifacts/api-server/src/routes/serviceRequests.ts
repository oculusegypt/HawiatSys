import { Router } from "express";
import { db, adminsTable, serviceRequestsTable, conversationsTable, messagesTable, activeVisitorsTable, containerSystemAuditTable, containerSystemRecordsTable } from "@workspace/db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { getSetting } from "./settings";
import { createNotification } from "../lib/pushNotifications";
import { requireAdmin, requireAdminOnly, requireDriver, requireRequestAssignment, requireManagerOrAdmin, requireAnySectionPermission, requireSectionPermission, type AdminRequest } from "../middleware/adminAuth";
import { sourceForRow } from "../lib/attribution";
import { syncCustomerFromRequest } from "../lib/customerSync";

const router = Router();
const MAX_CONTAINER_RENTAL_DURATION = "حتى 10 أيام أو امتلاء الحاوية، أيهما أقرب";

function isContainerRequest(serviceType: unknown, containerSize: unknown) {
  return /حاوي|container/i.test(`${String(serviceType ?? "")} ${String(containerSize ?? "")}`);
}

function validateContainerDuration(serviceType: unknown, containerSize: unknown, duration: unknown) {
  if (!isContainerRequest(serviceType, containerSize) || duration == null || String(duration).trim() === "") return null;
  return String(duration).trim() === MAX_CONTAINER_RENTAL_DURATION
    ? null
    : "مدة إيجار الحاوية لا تتجاوز 10 أيام أو حتى امتلائها، أيهما أقرب";
}

const ONLINE_WINDOW_MS = 90 * 1000;

const requestStatusTransitions: Record<string, Set<string>> = {
  pending: new Set(["pending", "in_progress", "cancelled", "rejected"]),
  in_progress: new Set(["in_progress", "completed", "cancelled", "rejected"]),
  completed: new Set(["completed"]),
  cancelled: new Set(["cancelled"]),
  rejected: new Set(["rejected"]),
};

function parseContainerPayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function containerCodeFrom(payload: Record<string, unknown>) {
  return String(payload.assetCode ?? payload.code ?? "").trim();
}

function isContainerWork(request: typeof serviceRequestsTable.$inferSelect) {
  return Boolean(request.contractRecordId) && /حاوي|نقاض|تفريغ|سحب|استرجاع|تسليم|container|debris|waste/i.test(
    `${request.serviceType} ${request.notes ?? ""}`,
  );
}

function isReturnWork(request: typeof serviceRequestsTable.$inferSelect) {
  return /استرجاع|سحب|رفع|return|withdraw/i.test(`${request.serviceType} ${request.notes ?? ""}`);
}

function isEmptyingWork(request: typeof serviceRequestsTable.$inferSelect) {
  return /تفريغ|empty|unload/i.test(`${request.serviceType} ${request.notes ?? ""}`);
}

function durationInMs(value?: string | null) {
  const text = String(value ?? "").toLowerCase();
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|ساعة|ساعات)/)?.[1] ?? 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes|دقيقة|دقائق)/)?.[1] ?? 0);
  const total = hours * 60 + minutes;
  return (Number.isFinite(total) && total > 0 ? total : 60) * 60 * 1000;
}

function dispatchWindow(request: typeof serviceRequestsTable.$inferSelect) {
  if (!request.scheduledAt) return null;
  const start = Date.parse(request.scheduledAt);
  if (!Number.isFinite(start)) return null;
  const hasTime = /T\d{2}:\d{2}/.test(request.scheduledAt);
  const end = start + (hasTime ? durationInMs(request.duration) : 24 * 60 * 60 * 1000);
  return { start, end };
}

function dispatchWindowsOverlap(
  left: typeof serviceRequestsTable.$inferSelect,
  right: typeof serviceRequestsTable.$inferSelect,
) {
  const leftWindow = dispatchWindow(left);
  const rightWindow = dispatchWindow(right);
  return Boolean(leftWindow && rightWindow && leftWindow.start < rightWindow.end && rightWindow.start < leftWindow.end);
}

function operationalRecordAsWorkOrder(record: typeof containerSystemRecordsTable.$inferSelect) {
  const payload = parseContainerPayload(record.payload);
  return {
    id: record.id,
    clientName: String(payload.customerName ?? payload.clientName ?? ""),
    phone: String(payload.phone ?? ""),
    email: String(payload.email ?? ""),
    serviceType: String(payload.serviceType ?? payload.operationType ?? "عملية تشغيلية"),
    containerSize: String(payload.containerCode ?? ""),
    propertyType: null,
    areaSize: null,
    location: String(payload.location ?? "يحدد لاحقًا"),
    duration: null,
    notes: String(payload.notes ?? ""),
    appointmentType: "scheduled",
    scheduledAt: payload.scheduledAt ? String(payload.scheduledAt) : null,
    status: String(payload.status ?? "new"),
    adminNotes: null,
    customerRecordId: Number(payload.customerRecordId ?? 0) || null,
    containerRecordId: Number(payload.containerRecordId ?? 0) || null,
    contractRecordId: Number(payload.contractRecordId ?? 0) || null,
    assignedDriverId: Number(payload.assignedDriverId ?? 0) || null,
    assignedVehicleId: Number(payload.assignedVehicleId ?? 0) || null,
    assignedVehiclePlate: payload.assignedVehiclePlate ? String(payload.assignedVehiclePlate) : null,
    driverStatus: String(payload.driverStatus ?? "unassigned"),
    driverResponseAt: payload.driverResponseAt ? String(payload.driverResponseAt) : null,
    driverStartedAt: payload.driverStartedAt ? String(payload.driverStartedAt) : null,
    driverCompletedAt: payload.driverCompletedAt ? String(payload.driverCompletedAt) : null,
    driverNotes: payload.driverNotes ? String(payload.driverNotes) : null,
    driverLocationLat: payload.driverLocationLat ? String(payload.driverLocationLat) : null,
    driverLocationLng: payload.driverLocationLng ? String(payload.driverLocationLng) : null,
    driverProofPhotoUrl: payload.driverProofPhotoUrl ? String(payload.driverProofPhotoUrl) : null,
    driverSignatureData: payload.driverSignatureData ? String(payload.driverSignatureData) : null,
    driverReceiverName: payload.driverReceiverName ? String(payload.driverReceiverName) : null,
    assignedAt: payload.assignedAt ? String(payload.assignedAt) : null,
    sessionId: "",
    acquisitionSource: "contract_workflow",
    attributionReferrer: "",
    attributionLandingPage: "",
    attributionUtmSource: "",
    attributionUtmMedium: "",
    attributionUtmCampaign: "",
    attributionGclid: "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  } as typeof serviceRequestsTable.$inferSelect;
}

async function prepareContainerCompletion(request: typeof serviceRequestsTable.$inferSelect) {
  if (!isContainerWork(request)) return null;
  const contract = await db.select().from(containerSystemRecordsTable)
    .where(eq(containerSystemRecordsTable.id, request.contractRecordId!)).get();
  if (!contract || contract.kind !== "contract" || contract.status === "archived") {
    throw new Error("العقد المرتبط بأمر العمل غير موجود");
  }
  const contractPayload = parseContainerPayload(contract.payload);
  const containerCode = String(contractPayload.containerCode ?? "").trim();
  if (!containerCode) throw new Error("العقد المرتبط لا يحتوي على رقم حاوية");
  const assets = await db.select().from(containerSystemRecordsTable);
  const asset = assets.find(record =>
    ["container", "container_asset"].includes(record.kind) &&
    record.status !== "archived" &&
    containerCodeFrom(parseContainerPayload(record.payload)) === containerCode,
  );
  if (!asset) throw new Error("أصل الحاوية المرتبط بأمر العمل غير موجود");
  return {
    contract,
    contractPayload,
    asset,
    containerCode,
    returning: isReturnWork(request),
    emptying: isEmptyingWork(request),
  };
}

type DbWriter = Pick<typeof db, "update" | "insert">;

function syncContainerCompletion(
  writer: DbWriter,
  request: typeof serviceRequestsTable.$inferSelect,
  prepared: Awaited<ReturnType<typeof prepareContainerCompletion>>,
  actorId: number,
) {
  if (!prepared) return;
  const now = new Date().toISOString();
  const action = prepared.returning ? "استرجاع" : prepared.emptying ? "تفريغ" : "تسليم";
  const contractStatus = prepared.returning ? "returned" : "delivered";
  const assetStatus = prepared.returning ? "available" : "rented";
  const nextContractPayload = {
    ...prepared.contractPayload,
    [`${prepared.returning ? "return" : "deliver"}At`]: now,
    lastWorkOrderId: request.id,
  };
  const nextAssetPayload = {
    ...parseContainerPayload(prepared.asset.payload),
    location: request.location,
    lastMovementAt: now,
    lastWorkOrderId: request.id,
  };

  if (!prepared.emptying) {
    writer.update(containerSystemRecordsTable).set({
      status: contractStatus,
      payload: JSON.stringify(nextContractPayload),
      updatedAt: now,
    }).where(eq(containerSystemRecordsTable.id, prepared.contract.id)).run();
    writer.update(containerSystemRecordsTable).set({
      status: assetStatus,
      payload: JSON.stringify(nextAssetPayload),
      updatedAt: now,
    }).where(eq(containerSystemRecordsTable.id, prepared.asset.id)).run();
  } else {
    writer.update(containerSystemRecordsTable).set({
      payload: JSON.stringify({
        ...parseContainerPayload(prepared.asset.payload),
        lastEmptyingAt: now,
        lastWorkOrderId: request.id,
      }),
      updatedAt: now,
    }).where(eq(containerSystemRecordsTable.id, prepared.asset.id)).run();
  }

  const movement = writer.insert(containerSystemRecordsTable).values({
    kind: "container_movement",
    status: "posted",
    reference: `MOV-${request.id}`,
      payload: JSON.stringify({
      contractNumber: prepared.contractPayload.contractNumber ?? prepared.contract.reference,
      containerCode: prepared.containerCode,
      movementType: action,
      movementDate: now,
      location: request.location,
      driverName: request.assignedDriverId,
      workOrderId: request.id,
        source: "driver_work_order",
        operationalOnly: prepared.emptying,
    }),
    createdBy: actorId,
  }).returning().get();
  writer.insert(containerSystemAuditTable).values([
    {
      recordId: prepared.asset.id,
      kind: prepared.asset.kind,
      action: "work_order_sync",
      beforePayload: prepared.asset.payload,
      afterPayload: JSON.stringify(nextAssetPayload),
      actorId,
    },
    {
      recordId: movement.id,
      kind: "container_movement",
      action: "work_order_create",
      afterPayload: movement.payload,
      actorId,
    },
  ]).run();
  if (!prepared.emptying) {
    writer.insert(containerSystemAuditTable).values({
      recordId: prepared.contract.id,
      kind: "contract",
      action: "work_order_sync",
      beforePayload: prepared.contract.payload,
      afterPayload: JSON.stringify(nextContractPayload),
      actorId,
    }).run();
  }
}

function isRecent(value: string | null | undefined, windowMs: number): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= windowMs;
}

function normalizePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00966")) return `0${digits.slice(5)}`;
  if (digits.startsWith("966")) return `0${digits.slice(3)}`;
  return digits;
}

async function addPresenceToRequests<T extends typeof serviceRequestsTable.$inferSelect>(requests: T[]) {
  const visitors = await db.select().from(activeVisitorsTable);
  const visitorBySession = new Map<string, typeof visitors[number]>();
  const visitorByPhone = new Map<string, typeof visitors[number]>();

  for (const visitor of visitors) {
    const previousSessionVisitor = visitorBySession.get(visitor.sessionId);
    if (!previousSessionVisitor || visitor.lastSeen > previousSessionVisitor.lastSeen) {
      visitorBySession.set(visitor.sessionId, visitor);
    }

    const phone = normalizePhone(visitor.phone);
    if (phone) {
      const previousPhoneVisitor = visitorByPhone.get(phone);
      if (!previousPhoneVisitor || visitor.lastSeen > previousPhoneVisitor.lastSeen) {
        visitorByPhone.set(phone, visitor);
      }
    }
  }

  return requests.map((request) => {
    // The session is the authoritative link. Phone matching is only a
    // fallback for requests created before the visitor session was persisted.
    const visitor = visitorBySession.get(request.sessionId) ??
      visitorByPhone.get(normalizePhone(request.phone));

    return {
      ...request,
      conversationId: visitor?.conversationId ?? null,
      isOnline: Boolean(visitor && isRecent(visitor.lastSeen, ONLINE_WINDOW_MS)),
      activePage: visitor?.page ?? null,
    };
  });
}

router.get("/service-requests", requireAdmin, requireSectionPermission("requests"), async (req, res) => {
  const adminRequest = req as AdminRequest;
  const { status } = req.query;
  if (adminRequest.adminRole === "driver") {
    return res.status(403).json({ error: "استخدم صفحة أوامر العمل للوصول إلى مهامك" });
  }
  if (status) {
    const requests = await db.select().from(serviceRequestsTable)
      .where(eq(serviceRequestsTable.status, status as string))
      .orderBy(desc(serviceRequestsTable.createdAt));
    return res.json(await addPresenceToRequests(requests));
  }
  const requests = await db.select().from(serviceRequestsTable).orderBy(desc(serviceRequestsTable.createdAt));
  return res.json(await addPresenceToRequests(requests));
});

router.post("/admin/service-requests/from-contract", requireAdmin, requireAnySectionPermission("requests", "container_system"), async (req, res) => {
  const {
    clientName,
    phone,
    email,
    serviceType,
    containerSize,
    location,
    duration,
    notes,
    appointmentType,
    scheduledAt,
    customerRecordId,
    containerRecordId,
    contractRecordId,
  } = req.body as Record<string, unknown>;

  const contractId = Number(contractRecordId);
  const customerId = Number(customerRecordId);
  const containerId = Number(containerRecordId);
  if (!Number.isInteger(contractId) || contractId <= 0 || !Number.isInteger(customerId) || customerId <= 0 || !Number.isInteger(containerId) || containerId <= 0) {
    return res.status(422).json({ error: "ربط أمر العمل بالعميل والعقد وأصل الحاوية مطلوب" });
  }
  if (!String(clientName ?? "").trim() || !String(phone ?? "").trim() || !String(scheduledAt ?? "").trim()) {
    return res.status(422).json({ error: "اسم العميل والجوال وموعد التنفيذ مطلوبة" });
  }
  const requestedServiceType = String(serviceType ?? "تسليم حاوية").trim();
  const scheduledDate = new Date(String(scheduledAt));
  if (!Number.isFinite(scheduledDate.getTime())) {
    return res.status(422).json({ error: "موعد التنفيذ غير صحيح" });
  }

  const [contract] = await db.select().from(containerSystemRecordsTable)
    .where(eq(containerSystemRecordsTable.id, contractId));
  if (!contract || contract.kind !== "contract" || contract.status === "archived") {
    return res.status(422).json({ error: "العقد المرتبط بأمر العمل غير موجود" });
  }
  const contractPayload = parseContainerPayload(contract.payload);
  const [customerRecord] = await db.select().from(containerSystemRecordsTable)
    .where(eq(containerSystemRecordsTable.id, customerId));
  const [containerRecord] = await db.select().from(containerSystemRecordsTable)
    .where(eq(containerSystemRecordsTable.id, containerId));
  const customerPayload = parseContainerPayload(customerRecord?.payload);
  const containerPayload = parseContainerPayload(containerRecord?.payload);
  const customerMatches = Number(contractPayload.customerRecordId) === customerId ||
    (!contractPayload.customerRecordId && String(contractPayload.customerName ?? "").trim() !== "" &&
      String(contractPayload.customerName).trim() === String(customerPayload.name ?? customerPayload.customerName ?? clientName).trim());
  const containerCode = String(containerPayload.assetCode ?? containerPayload.containerCode ?? containerPayload.code ?? containerRecord?.reference ?? "").trim();
  const containerMatches = Number(contractPayload.containerRecordId) === containerId ||
    (!contractPayload.containerRecordId && containerCode !== "" &&
      containerCode === String(contractPayload.containerCode ?? contractPayload.assetCode ?? "").trim());
  if (!customerRecord || customerRecord.kind !== "customer" || !containerRecord ||
    !["container", "container_asset"].includes(containerRecord.kind) || !customerMatches || !containerMatches) {
    return res.status(409).json({ error: "علاقات أمر العمل لا تطابق العميل أو أصل الحاوية في العقد" });
  }
  const operationKey = `contract-operation-${contractId}-${String(scheduledAt).replace(/[^0-9]/g, "").slice(0, 24)}-${requestedServiceType.slice(0, 20)}`;
  const existingWorkOrder = (await db.select().from(containerSystemRecordsTable))
    .find(row => row.kind === "work_order" && row.status !== "archived" &&
      parseContainerPayload(row.payload).operationKey === operationKey);
  if (existingWorkOrder) return res.status(200).json(operationalRecordAsWorkOrder(existingWorkOrder));

  const [existingRequest] = await db.select().from(serviceRequestsTable)
    .where(and(
      eq(serviceRequestsTable.contractRecordId, contractId),
      eq(serviceRequestsTable.acquisitionSource, "contract_workflow"),
      eq(serviceRequestsTable.scheduledAt, String(scheduledAt)),
      eq(serviceRequestsTable.serviceType, requestedServiceType),
    ));
  const operation = String(requestedServiceType).match(/تفريغ|empty/i) ? "EMPTY_CONTAINER" :
    String(requestedServiceType).match(/استرجاع|سحب|pickup|return/i) ? "PICKUP_CONTAINER" : "DELIVER_CONTAINER";
  const [appointment] = await db.insert(containerSystemRecordsTable).values({
    kind: "appointment",
    status: "scheduled",
    reference: `APT-${contractId}-${Date.now()}`,
    payload: JSON.stringify({
      operationKey: `${operationKey}:appointment`,
      contractRecordId: contractId,
      customerRecordId: customerId,
      containerRecordId: containerId,
      appointmentType: operation,
      scheduledAt: String(scheduledAt),
      location: String(location ?? "يحدد لاحقًا"),
      source: "contract_operation",
    }),
    createdBy: (req as AdminRequest).adminId,
  }).returning();
  const workOrderPayload = {
    operationKey,
    workOrderNumber: `WO-${contractId}-${Date.now()}`,
    customerRecordId: customerId, containerRecordId: containerId, contractRecordId: contractId,
    clientName: String(clientName).trim(), customerName: String(clientName).trim(),
    phone: String(phone).trim(), email: email ? String(email).trim() : "",
    serviceType: requestedServiceType, operationType: operation,
    containerSize: String(containerSize ?? ""), location: String(location ?? "يحدد لاحقًا"),
    duration: duration ? String(duration) : "", notes: notes ? String(notes) : "",
    appointmentType: String(appointmentType ?? "scheduled"), scheduledAt: String(scheduledAt),
    appointmentRecordId: appointment.id,
    driverStatus: "unassigned", status: "new", source: "contract_operation",
    legacyRequestId: existingRequest?.id ?? null,
  };
  const [workOrder] = await db.insert(containerSystemRecordsTable).values({
    kind: "work_order", status: "new", reference: workOrderPayload.workOrderNumber,
    payload: JSON.stringify(workOrderPayload), operationKey, createdBy: (req as AdminRequest).adminId,
  }).returning();
  await db.update(containerSystemRecordsTable).set({
    payload: JSON.stringify({
      ...parseContainerPayload(appointment.payload),
      workOrderRecordId: workOrder.id,
    }),
    updatedAt: new Date().toISOString(),
  }).where(eq(containerSystemRecordsTable.id, appointment.id));

  await createNotification({
    title: "أمر عمل جديد من عقد",
    message: `تم إنشاء أمر عمل مرتبط بالعقد ${String(contractPayload.contractNumber ?? contract.reference)}`,
    type: "service_request",
    refId: workOrder.id,
    refType: "work_order",
  });
  return res.status(201).json(operationalRecordAsWorkOrder(workOrder));
});

router.post("/service-requests", async (req, res) => {
  const {
    isQuoteRequest,
    clientName,
    phone,
    email,
    serviceType,
    containerSize,
    location,
    duration,
    notes,
    appointmentType,
    scheduledAt,
    conversationId: rawConversationId,
    tracking: rawTracking,
  } = req.body;
  const tracking = rawTracking && typeof rawTracking === "object"
    ? rawTracking as Record<string, unknown>
    : {};
  const trackingValue = (key: string, max = 500) =>
    typeof tracking[key] === "string" ? tracking[key].trim().slice(0, max) : "";
  const attribution = {
    sessionId: trackingValue("sessionId", 160),
    referrer: trackingValue("referrer", 1000),
    utmSource: trackingValue("utmSource", 160),
    utmMedium: trackingValue("utmMedium", 160),
    utmCampaign: trackingValue("utmCampaign", 160),
    gclid: trackingValue("gclid", 200),
  };
  const conversationId = rawConversationId == null || rawConversationId === ""
    ? null
    : Number(rawConversationId);
  if (conversationId !== null && (!Number.isInteger(conversationId) || conversationId <= 0)) {
    return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });
  }
  if (conversationId !== null) {
    const [conversation] = await db.select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId));
    if (!conversation) return res.status(404).json({ error: "المحادثة غير موجودة" });
  }

  // Check if requests are locked (quote requests bypass the lock)
  if (!isQuoteRequest) {
    const locked = await getSetting("requests_locked");
    if (locked === "true") {
      const msg = await getSetting("requests_locked_message");
      return res.status(503).json({ error: "requests_locked", message: msg });
    }
  }
  const finalNotes = isQuoteRequest
    ? `[طلب عرض سعر] ${notes || ""}`.trim()
    : notes;
  const durationError = validateContainerDuration(serviceType, containerSize, duration);
  if (durationError) return res.status(422).json({ error: durationError });

  const [request] = await db.insert(serviceRequestsTable).values({
    clientName, phone, email,
    serviceType: serviceType || "طلب عرض سعر",
    // SQLite schema requires a non-NULL value; match the PHP endpoint's
    // empty-string fallback when the client submits no container size.
    containerSize: containerSize || "",
    location: location || "غير محدد",
    duration,
    notes: finalNotes,
    appointmentType: isQuoteRequest ? "immediate" : (appointmentType || "immediate"),
    scheduledAt: scheduledAt || null,
    sessionId: attribution.sessionId,
    acquisitionSource: sourceForRow(attribution),
    attributionReferrer: attribution.referrer,
    attributionLandingPage: trackingValue("landingPage", 500),
    attributionUtmSource: attribution.utmSource,
    attributionUtmMedium: attribution.utmMedium,
    attributionUtmCampaign: attribution.utmCampaign,
    attributionGclid: attribution.gclid,
  }).returning();

  try {
    const synced = await syncCustomerFromRequest(request);
    Object.assign(request, synced.request);
  } catch (error) {
    req.log.warn({ err: error, requestId: request.id }, "customer auto-save skipped");
  }

  // Create notification
  await createNotification({
    title: "طلب خدمة جديد",
    message: `تم استلام طلب جديد من ${clientName}`,
    type: "service_request",
    refId: request.id,
    refType: "service_request",
  });

  if (conversationId !== null) {
    const detailsContent = [
      `تم إرسال تفاصيل طلب الباقة من ${request.clientName}`,
      `الاسم: ${request.clientName}`,
      `رقم الجوال: ${request.phone}`,
      `الخدمة: ${request.serviceType}`,
      request.containerSize ? `الباقة / المقاس: ${request.containerSize}` : "",
      `الموقع: ${request.location}`,
      request.appointmentType === "scheduled" && request.scheduledAt
        ? `الموعد: ${request.scheduledAt}`
        : "الموعد: أقرب وقت ممكن",
      request.duration ? `المدة: ${request.duration}` : "",
      request.notes ? `التفاصيل الإضافية:\n${request.notes}` : "",
    ].filter(Boolean).join("\n");

    await db.insert(messagesTable).values({
      conversationId,
      content: detailsContent,
      messageType: "text",
      metadata: JSON.stringify({ requestId: request.id, kind: "order_details" }),
      senderType: "client",
    });

    const confirmationContent = `تم تأكيد طلب الخدمة رقم #${request.id} من داخل المحادثة`;
    await db.insert(messagesTable).values({
      conversationId,
      content: confirmationContent,
      messageType: "order_confirmation",
      metadata: JSON.stringify({ requestId: request.id }),
      senderType: "client",
    });
    await db.update(conversationsTable)
      .set({
        lastMessage: confirmationContent,
        updatedAt: new Date().toISOString(),
        unreadCount: sql`unread_count + 1`,
      })
      .where(eq(conversationsTable.id, conversationId));
  }

  return res.status(201).json(request);
});

// Public order tracking relies on this lookup, so keep the single-request
// endpoint public while protecting the administrative list and mutations.
router.get("/service-requests/:id", async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, id));
  if (!request) return res.status(404).json({ error: "Not found" });
  const [decoratedRequest] = await addPresenceToRequests([request]);
  // Public tracking needs enough information to identify an order, never its
  // operational evidence, private notes, or live driver location.
  const {
    id: requestId, clientName, phone, serviceType, containerSize, status,
    appointmentType, scheduledAt, createdAt, updatedAt,
  } = decoratedRequest;
  return res.json({
    id: requestId, clientName, phone, serviceType, containerSize, status,
    appointmentType, scheduledAt, createdAt, updatedAt,
  });
});

router.patch("/service-requests/:id", requireAdmin, requireSectionPermission("requests"), async (req, res) => {
  const adminRequest = req as AdminRequest;
  if (adminRequest.adminRole === "driver") {
    return res.status(403).json({ error: "لا يملك السائق صلاحية تعديل الطلب مباشرة" });
  }
  const id = parseInt(String(req.params.id), 10);
  const {
    clientName, phone, email, serviceType, containerSize, location,
    duration, notes, appointmentType, scheduledAt, status, adminNotes,
    customerRecordId, containerRecordId, contractRecordId,
  } = req.body;

  type UpdateFields = Partial<typeof serviceRequestsTable.$inferInsert> & { updatedAt: string };
  const updateData: UpdateFields = { updatedAt: new Date().toISOString() };
  if (clientName !== undefined)      updateData.clientName      = clientName;
  if (phone !== undefined)           updateData.phone           = phone;
  if (email !== undefined)           updateData.email           = email;
  if (serviceType !== undefined)     updateData.serviceType     = serviceType;
  if (containerSize !== undefined)   updateData.containerSize   = containerSize || "";
  if (location !== undefined)        updateData.location        = location;
  if (duration !== undefined) {
    const durationError = validateContainerDuration(serviceType, containerSize, duration);
    if (durationError) return res.status(422).json({ error: durationError });
    updateData.duration = duration;
  }
  if (notes !== undefined)           updateData.notes           = notes;
  if (appointmentType !== undefined) updateData.appointmentType = appointmentType;
  if (scheduledAt !== undefined)     updateData.scheduledAt     = scheduledAt;
  if (status !== undefined)          updateData.status          = status;
  if (adminNotes !== undefined)      updateData.adminNotes      = adminNotes;
  if (customerRecordId !== undefined)  updateData.customerRecordId = customerRecordId === null ? null : Number(customerRecordId);
  if (containerRecordId !== undefined) updateData.containerRecordId = containerRecordId === null ? null : Number(containerRecordId);
  if (contractRecordId !== undefined)  updateData.contractRecordId = contractRecordId === null ? null : Number(contractRecordId);

  let previousStatus: string | undefined;
  if (status !== undefined) {
    if (!requestStatusTransitions[status]) {
      return res.status(422).json({ error: "حالة الطلب غير مدعومة" });
    }
    const [current] = await db.select({ status: serviceRequestsTable.status })
      .from(serviceRequestsTable)
      .where(eq(serviceRequestsTable.id, id));
    if (!current) return res.status(404).json({ error: "Not found" });
    previousStatus = current.status;
    if (!requestStatusTransitions[current.status]?.has(status)) {
      return res.status(409).json({ error: `لا يمكن نقل الطلب من ${current.status} إلى ${status}` });
    }
  }

  const [request] = await db.update(serviceRequestsTable)
    .set(updateData)
    .where(eq(serviceRequestsTable.id, id))
    .returning();
  if (!request) return res.status(404).json({ error: "Not found" });
  if (previousStatus !== undefined && previousStatus !== request.status) {
    await db.insert(containerSystemAuditTable).values({
      recordId: id,
      kind: "service_request",
      action: "request_status_transition",
      beforePayload: JSON.stringify({ status: previousStatus }),
      afterPayload: JSON.stringify({ status: request.status, adminNotes: request.adminNotes }),
      actorId: adminRequest.adminId,
    });
  }
  return res.json(request);
});

router.patch("/service-requests/:id/assignment", requireAdmin, requireSectionPermission("work_orders"), requireRequestAssignment, async (req, res) => {
  const adminRequest = req as AdminRequest;
  const id = parseInt(String(req.params.id), 10);
  const driverId = req.body?.driverId === null || req.body?.driverId === undefined
    ? null
    : Number(req.body.driverId);
  const vehicleId = req.body?.vehicleId === null || req.body?.vehicleId === undefined
    ? null
    : Number(req.body.vehicleId);

  if (driverId !== null && (!Number.isInteger(driverId) || driverId <= 0)) {
    return res.status(400).json({ error: "معرّف السائق غير صحيح" });
  }
  if (vehicleId !== null && (!Number.isInteger(vehicleId) || vehicleId <= 0)) {
    return res.status(400).json({ error: "معرّف الشاحنة غير صحيح" });
  }

  if (driverId !== null) {
    const [driver] = await db.select({
      id: adminsTable.id,
      role: adminsTable.role,
      isActive: adminsTable.isActive,
    }).from(adminsTable).where(eq(adminsTable.id, driverId));
    if (!driver || driver.role !== "driver" || driver.isActive === 0) {
      return res.status(400).json({ error: "السائق غير موجود أو غير نشط" });
    }
  }
  let vehiclePlate: string | null = null;
  if (vehicleId !== null) {
    const vehicle = await db.select().from(containerSystemRecordsTable)
      .where(eq(containerSystemRecordsTable.id, vehicleId)).get();
    if (!vehicle || vehicle.kind !== "vehicle" || vehicle.status === "archived") {
      return res.status(400).json({ error: "الشاحنة غير موجودة أو مؤرشفة" });
    }
    if (!["available", "ready", "active", "متاحة", "جاهزة", "نشطة"].includes(vehicle.status)) {
      return res.status(409).json({ error: "الشاحنة ليست متاحة للإسناد" });
    }
    const vehiclePayload = parseContainerPayload(vehicle.payload);
    vehiclePlate = String(vehiclePayload.vehiclePlate ?? vehiclePayload.plateNumber ?? vehiclePayload.plate ?? vehicle.reference ?? "").trim();
  }

  const operationalRow = await db.select().from(containerSystemRecordsTable)
    .where(eq(containerSystemRecordsTable.id, id)).get();
  if (operationalRow?.kind === "work_order") {
    const current = operationalRecordAsWorkOrder(operationalRow);
    const currentPayload = parseContainerPayload(operationalRow.payload);
    if (["completed", "rejected"].includes(current.driverStatus)) {
      return res.status(409).json({ error: "لا يمكن إعادة إسناد أمر عمل مغلق" });
    }
    const now = new Date().toISOString();
    const nextPayload = {
      ...currentPayload,
      assignedDriverId: driverId,
      assignedVehicleId: vehicleId,
      assignedVehiclePlate: vehiclePlate,
      assignedAt: driverId ? now : null,
      driverStatus: driverId ? "assigned" : "unassigned",
      status: driverId ? "assigned" : "new",
    };
    const updated = db.transaction((tx) => {
      const next = tx.update(containerSystemRecordsTable).set({
        status: driverId ? "assigned" : "new",
        payload: JSON.stringify(nextPayload),
        updatedAt: now,
      }).where(eq(containerSystemRecordsTable.id, id)).returning().get();
      if (!next) throw new Error("تعذر تحديث إسناد أمر العمل");
      tx.insert(containerSystemAuditTable).values({
        recordId: id, kind: "work_order", action: "work_order_assignment",
        beforePayload: operationalRow.payload, afterPayload: JSON.stringify(nextPayload), actorId: adminRequest.adminId,
      }).run();
      return operationalRecordAsWorkOrder(next);
    });
    return res.json(updated);
  }

  const [request] = await db.select().from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, id));
  if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
  if (["completed", "rejected"].includes(request.driverStatus)) {
    return res.status(409).json({ error: "لا يمكن إعادة إسناد أمر عمل مغلق" });
  }
  if ((driverId !== null || vehicleId !== null) && request.scheduledAt) {
    const scheduledOrders = await db.select().from(serviceRequestsTable);
    const conflict = scheduledOrders.find(item =>
      item.id !== id &&
      dispatchWindowsOverlap(item, request) &&
      !["completed", "rejected"].includes(item.driverStatus) &&
      ((driverId !== null && item.assignedDriverId === driverId) ||
        (vehicleId !== null && item.assignedVehicleId === vehicleId)),
    );
    if (conflict) {
      const sameDriver = driverId !== null && conflict.assignedDriverId === driverId;
      return res.status(409).json({
        error: sameDriver
          ? "السائق مسند إلى أمر عمل آخر في نفس اليوم"
          : "الشاحنة مسندة إلى أمر عمل آخر في نفس اليوم",
      });
    }
  }

  const now = new Date().toISOString();
  const [updated] = await db.update(serviceRequestsTable).set({
    assignedDriverId: driverId,
    assignedVehicleId: vehicleId,
    assignedVehiclePlate: vehiclePlate,
    driverStatus: driverId === null ? "unassigned" : "assigned",
    driverResponseAt: null,
    driverStartedAt: null,
    driverCompletedAt: null,
    driverNotes: null,
    assignedAt: driverId === null ? null : now,
    updatedAt: now,
    ...(req.body?.adminNotes !== undefined ? { adminNotes: req.body.adminNotes || null } : {}),
  }).where(eq(serviceRequestsTable.id, id)).returning();

  if (driverId !== null) {
    await createNotification({
      title: "أمر عمل جديد",
      message: `تم إسناد الطلب رقم ${id} إليك`,
      type: "service_request",
      refId: id,
      refType: "service_request",
      recipientAdminId: driverId,
    });
  }
  return res.json(updated);
});

router.get("/driver/work-orders", requireAdmin, requireDriver, async (req, res) => {
  const adminRequest = req as AdminRequest;
  const requestedStatus = typeof req.query.status === "string" ? req.query.status : undefined;
  const allowedStatuses = new Set(["assigned", "accepted", "rejected", "started", "en_route", "arrived", "completed"]);
  if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
    return res.status(400).json({ error: "حالة أمر العمل غير صحيحة" });
  }

  const filters = [
    eq(serviceRequestsTable.assignedDriverId, adminRequest.adminId),
    ...(requestedStatus ? [eq(serviceRequestsTable.driverStatus, requestedStatus)] : []),
  ];
  const requests = await db.select().from(serviceRequestsTable)
    .where(and(...filters))
    .orderBy(desc(serviceRequestsTable.assignedAt), desc(serviceRequestsTable.createdAt));
  const operationalRows = await db.select().from(containerSystemRecordsTable);
  const operational = operationalRows
    .filter(row => row.kind === "work_order" && row.status !== "archived")
    .map(operationalRecordAsWorkOrder)
    .filter(order => order.assignedDriverId === adminRequest.adminId &&
      (!requestedStatus || order.driverStatus === requestedStatus));
  return res.json([...requests, ...operational]);
});

router.get("/admin/work-orders", requireAdmin, requireSectionPermission("work_orders"), requireManagerOrAdmin, async (_req, res) => {
  const requests = await db.select().from(serviceRequestsTable)
    .where(and(
      inArray(serviceRequestsTable.driverStatus, ["unassigned", "assigned", "accepted", "started", "en_route", "arrived"]),
    ))
    .orderBy(desc(serviceRequestsTable.assignedAt), desc(serviceRequestsTable.createdAt));
  const operationalRows = await db.select().from(containerSystemRecordsTable);
  const operational = operationalRows
    .filter(row => row.kind === "work_order" && row.status !== "archived")
    .map(operationalRecordAsWorkOrder)
    .filter(order => ["unassigned", "assigned", "accepted", "started", "en_route", "arrived"].includes(order.driverStatus));
  const allOrders = [...requests, ...operational];
  const driverIds = [...new Set(allOrders.map(request => request.assignedDriverId).filter((id): id is number => id !== null))];
  const drivers = driverIds.length > 0
    ? await db.select({ id: adminsTable.id, name: adminsTable.name })
      .from(adminsTable)
      .where(inArray(adminsTable.id, driverIds))
    : [];
  const driverNames = new Map(drivers.map(driver => [driver.id, driver.name]));
  return res.json(allOrders.map(request => ({
    ...request,
    assignedDriverName: request.assignedDriverId ? driverNames.get(request.assignedDriverId) ?? null : null,
  })));
});

router.patch("/driver/work-orders/:id", requireAdmin, requireDriver, async (req, res) => {
  const adminRequest = req as AdminRequest;
  const id = parseInt(String(req.params.id), 10);
  const nextStatus = String(req.body?.status ?? "");
  const operationKey = String(req.get("Idempotency-Key") ?? req.body?.operationKey ?? "").trim();
  const notes = req.body?.notes === undefined ? undefined : String(req.body.notes ?? "").trim();
  const locationLat = req.body?.locationLat === undefined ? undefined : String(req.body.locationLat ?? "").trim();
  const locationLng = req.body?.locationLng === undefined ? undefined : String(req.body.locationLng ?? "").trim();
  const proofPhotoUrl = req.body?.proofPhotoUrl === undefined ? undefined : String(req.body.proofPhotoUrl ?? "").trim();
  const signatureData = req.body?.signatureData === undefined ? undefined : String(req.body.signatureData ?? "").trim();
  const receiverName = req.body?.receiverName === undefined ? undefined : String(req.body.receiverName ?? "").trim();
  const transitions: Record<string, string[]> = {
    assigned: ["accepted", "rejected"],
    accepted: ["started"],
    started: ["en_route", "completed"],
    en_route: ["arrived"],
    arrived: ["completed"],
  };
  if (!transitions[nextStatus] && nextStatus !== "completed") {
    return res.status(400).json({ error: "حالة أمر العمل غير صحيحة" });
  }
  if (operationKey && (operationKey.length < 8 || operationKey.length > 160)) {
    return res.status(422).json({ error: "مفتاح العملية غير صالح" });
  }

  const operationalRow = await db.select().from(containerSystemRecordsTable)
    .where(eq(containerSystemRecordsTable.id, id)).get();
  if (operationalRow?.kind === "work_order") {
    const current = operationalRecordAsWorkOrder(operationalRow);
    if (current.assignedDriverId !== adminRequest.adminId) return res.status(404).json({ error: "أمر العمل غير موجود" });
    if (current.driverStatus === nextStatus) return res.json(current);
    if (["completed", "rejected"].includes(current.driverStatus) || !transitions[current.driverStatus]?.includes(nextStatus)) {
      return res.status(400).json({ error: "لا يمكن الانتقال من الحالة الحالية إلى هذه الحالة" });
    }
    let preparedContainerCompletion: Awaited<ReturnType<typeof prepareContainerCompletion>> = null;
    if (nextStatus === "completed") {
      try {
        preparedContainerCompletion = await prepareContainerCompletion(current);
      } catch (error) {
        return res.status(422).json({ error: error instanceof Error ? error.message : "تعذر التحقق من ارتباط الحاوية بالعقد" });
      }
      if (preparedContainerCompletion && (!receiverName || !signatureData || !proofPhotoUrl)) {
        return res.status(422).json({ error: "يلزم تسجيل اسم المستلم وتوقيع العميل وصورة إثبات قبل إكمال حركة الحاوية" });
      }
    }
    const now = new Date().toISOString();
    const currentPayload = parseContainerPayload(operationalRow.payload);
    const nextPayload = {
      ...currentPayload,
      driverStatus: nextStatus,
      status: nextStatus === "completed" ? "completed" : currentPayload.status,
      driverResponseAt: currentPayload.driverResponseAt ?? (nextStatus === "accepted" || nextStatus === "rejected" ? now : null),
      driverStartedAt: nextStatus === "started" ? now : currentPayload.driverStartedAt,
      driverCompletedAt: nextStatus === "completed" ? now : currentPayload.driverCompletedAt,
      ...(notes !== undefined ? { driverNotes: notes || null } : {}),
      ...(locationLat !== undefined ? { driverLocationLat: locationLat || null } : {}),
      ...(locationLng !== undefined ? { driverLocationLng: locationLng || null } : {}),
      ...(proofPhotoUrl !== undefined ? { driverProofPhotoUrl: proofPhotoUrl || null } : {}),
      ...(signatureData !== undefined ? { driverSignatureData: signatureData || null } : {}),
      ...(receiverName !== undefined ? { driverReceiverName: receiverName || null } : {}),
      ...(operationKey ? { lastOperationKey: operationKey } : {}),
    };
    const updated = db.transaction((tx) => {
      const next = tx.update(containerSystemRecordsTable).set({
        status: nextPayload.status === "completed" ? "completed" : operationalRow.status,
        payload: JSON.stringify(nextPayload),
        updatedAt: now,
      }).where(eq(containerSystemRecordsTable.id, id)).returning().get();
      if (!next) throw new Error("تعذر تحديث أمر العمل");
      if (nextStatus === "completed" && preparedContainerCompletion) {
        syncContainerCompletion(tx, operationalRecordAsWorkOrder(next), preparedContainerCompletion, adminRequest.adminId);
      }
      tx.insert(containerSystemAuditTable).values({
        recordId: id, kind: "work_order", action: "driver_status_transition",
        beforePayload: operationalRow.payload, afterPayload: JSON.stringify(nextPayload), actorId: adminRequest.adminId,
      }).run();
      return operationalRecordAsWorkOrder(next);
    });
    return res.json(updated);
  }

  const [request] = await db.select().from(serviceRequestsTable)
    .where(and(
      eq(serviceRequestsTable.id, id),
      eq(serviceRequestsTable.assignedDriverId, adminRequest.adminId),
    ));
  if (!request) return res.status(404).json({ error: "أمر العمل غير موجود" });
  if (request.driverStatus === nextStatus) {
    return res.json(request);
  }
  if (request.driverStatus === "completed" || request.driverStatus === "rejected") {
    return res.status(400).json({ error: "لا يمكن تغيير أمر العمل بعد إغلاقه" });
  }
  if (!transitions[request.driverStatus]?.includes(nextStatus)) {
    return res.status(400).json({ error: "لا يمكن الانتقال من الحالة الحالية إلى هذه الحالة" });
  }
  if (locationLat !== undefined && locationLat && (!Number.isFinite(Number(locationLat)) || Number(locationLat) < -90 || Number(locationLat) > 90)) {
    return res.status(422).json({ error: "خط العرض غير صحيح" });
  }
  if (locationLng !== undefined && locationLng && (!Number.isFinite(Number(locationLng)) || Number(locationLng) < -180 || Number(locationLng) > 180)) {
    return res.status(422).json({ error: "خط الطول غير صحيح" });
  }

  let preparedContainerCompletion: Awaited<ReturnType<typeof prepareContainerCompletion>> = null;
  if (nextStatus === "completed") {
    try {
      preparedContainerCompletion = await prepareContainerCompletion(request);
    } catch (error) {
      return res.status(422).json({
        error: error instanceof Error ? error.message : "لا يمكن إكمال أمر العمل قبل اكتمال ربط العقد والحاوية",
      });
    }
    if (preparedContainerCompletion && (!receiverName || !signatureData || !proofPhotoUrl)) {
      return res.status(422).json({ error: "يلزم تسجيل اسم المستلم وتوقيع العميل وصورة إثبات قبل إكمال حركة الحاوية" });
    }
  }

  const now = new Date().toISOString();
  const updateData: Partial<typeof serviceRequestsTable.$inferInsert> = {
    driverStatus: nextStatus,
    driverResponseAt: request.driverResponseAt ?? (nextStatus === "accepted" || nextStatus === "rejected" ? now : null),
    driverStartedAt: nextStatus === "started" ? now : request.driverStartedAt,
    driverCompletedAt: nextStatus === "completed" ? now : request.driverCompletedAt,
    driverNotes: notes === undefined ? request.driverNotes : notes || null,
    driverLocationLat: locationLat === undefined ? request.driverLocationLat : locationLat || null,
    driverLocationLng: locationLng === undefined ? request.driverLocationLng : locationLng || null,
    driverProofPhotoUrl: proofPhotoUrl === undefined ? request.driverProofPhotoUrl : proofPhotoUrl || null,
    driverSignatureData: signatureData === undefined ? request.driverSignatureData : signatureData || null,
    driverReceiverName: receiverName === undefined ? request.driverReceiverName : receiverName || null,
    status: nextStatus === "started" || nextStatus === "completed"
      ? nextStatus === "completed" ? "completed" : "in_progress"
      : request.status,
    updatedAt: now,
  };
  let updated: typeof serviceRequestsTable.$inferSelect;
  try {
    updated = db.transaction((tx) => {
      if (operationKey) {
        const previous = tx.select().from(containerSystemAuditTable)
          .where(and(
            eq(containerSystemAuditTable.recordId, id),
            eq(containerSystemAuditTable.kind, "service_request"),
            eq(containerSystemAuditTable.action, "driver_status_transition"),
          )).all().find((audit) => {
            const payload = parseContainerPayload(audit.afterPayload ?? "");
            return payload.operationKey === operationKey;
          });
        if (previous) {
          const existing = tx.select().from(serviceRequestsTable)
            .where(eq(serviceRequestsTable.id, id)).get();
          if (!existing) throw new Error("أمر العمل غير موجود");
          return existing;
        }
      }
      const nextRequest = tx.update(serviceRequestsTable).set(updateData)
        .where(eq(serviceRequestsTable.id, id)).returning().get();
      if (!nextRequest) throw new Error("تعذر تحديث أمر العمل");

      if (nextStatus === "completed" && preparedContainerCompletion) {
        syncContainerCompletion(tx, nextRequest, preparedContainerCompletion, adminRequest.adminId);
      }

      tx.insert(containerSystemAuditTable).values({
        recordId: id,
        kind: "service_request",
        action: "driver_status_transition",
        beforePayload: JSON.stringify({
          driverStatus: request.driverStatus,
          status: request.status,
          driverNotes: request.driverNotes,
        }),
        afterPayload: JSON.stringify({
          driverStatus: nextRequest.driverStatus,
          status: nextRequest.status,
          driverNotes: nextRequest.driverNotes,
          driverResponseAt: nextRequest.driverResponseAt,
          driverStartedAt: nextRequest.driverStartedAt,
          driverCompletedAt: nextRequest.driverCompletedAt,
          operationKey: operationKey || undefined,
        }),
        actorId: adminRequest.adminId,
      }).run();

      return nextRequest;
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "تعذر حفظ انتقال أمر العمل بشكل كامل",
    });
  }
  if (["accepted", "rejected", "completed"].includes(nextStatus)) {
    const statusLabel = nextStatus === "accepted" ? "قبول" : nextStatus === "rejected" ? "رفض" : "إكمال";
    await createNotification({
      title: `تحديث أمر العمل: ${statusLabel}`,
      message: `قام السائق بتحديث الطلب رقم ${id} إلى حالة ${statusLabel}${notes ? ` — ${notes}` : ""}`,
      type: "driver_status",
      refId: id,
      refType: "service_request",
    });
  }
  return res.json(updated);
});

router.delete("/service-requests/:id", requireAdmin, requireSectionPermission("requests", { adminOnly: true }), requireAdminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [deleted] = await db.delete(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, id))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  return res.status(204).end();
});

export default router;
