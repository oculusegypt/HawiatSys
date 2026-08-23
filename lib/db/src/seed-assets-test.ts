import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { containerSystemRecordsTable } from "./schema/containerSystem.js";

const today = new Date().toISOString().slice(0, 10);

function upsertRecord(
  kind: "container" | "driver",
  reference: string,
  status: string,
  payload: Record<string, unknown>,
) {
  const existing = db.select().from(containerSystemRecordsTable)
    .where(and(
      eq(containerSystemRecordsTable.kind, kind),
      eq(containerSystemRecordsTable.reference, reference),
    )).get();
  const serialized = JSON.stringify(payload);
  if (existing) {
    db.update(containerSystemRecordsTable).set({
      status,
      payload: serialized,
      updatedAt: new Date().toISOString(),
    }).where(eq(containerSystemRecordsTable.id, existing.id)).run();
    return existing.id;
  }
  return db.insert(containerSystemRecordsTable).values({
    kind,
    status,
    reference,
    payload: serialized,
  }).returning().get().id;
}

const drivers = [
  ["DEMO-DRV-001", "خالد محمد الحربي", "0541112233", "DL-88421", "available", "متاح"],
  ["DEMO-DRV-002", "يوسف ناصر القحطاني", "0562223344", "DL-77219", "busy", "في مهمة"],
  ["DEMO-DRV-003", "سعد أحمد المطيري", "0573334455", "DL-66310", "available", "متاح"],
] as const;

const driverIds = drivers.map(([reference, name, phone, license, status, statusLabel]) => ({
  reference,
  id: upsertRecord("driver", reference, status, {
    name,
    phone,
    license,
    status: statusLabel,
    city: "الرياض",
    testData: true,
  }),
}));

const containers: Array<[string, 12 | 20, string, string, string]> = [
  ["CNT-101", 12, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["CNT-102", 12, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["CNT-103", 12, "rented", "مشروع الياسمين", "مؤجرة لعقد تجريبي"],
  ["CNT-104", 12, "available", "مستودع الشمال", "تم الفحص"],
  ["CNT-105", 12, "maintenance", "ورشة الرياض", "تحتاج فحص أبواب"],
  ["CNT-106", 12, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["CNT-107", 12, "busy", "في مهمة ميدانية", "مع السائق يوسف القحطاني"],
  ["CNT-108", 12, "available", "مستودع الشمال", "جاهزة للتخصيص"],
  ["CNT-109", 12, "available", "مستودع الرياض", "تم الفحص"],
  ["CNT-110", 12, "rented", "حي النرجس", "مؤجرة لعقد تجريبي"],
  ["CNT-111", 20, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["CNT-112", 20, "available", "مستودع الرياض", "تم الفحص"],
  ["CNT-113", 20, "rented", "مشروع الملقا", "مؤجرة لعقد تجريبي"],
  ["CNT-114", 20, "available", "مستودع الجنوب", "جاهزة للتخصيص"],
  ["CNT-115", 20, "maintenance", "ورشة الرياض", "تحتاج دهاناً خارجياً"],
  ["CNT-116", 20, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["CNT-117", 20, "busy", "في مهمة ميدانية", "مع السائق خالد الحربي"],
  ["CNT-118", 20, "available", "مستودع الجنوب", "تم الفحص"],
  ["CNT-119", 20, "available", "مستودع الرياض", "جاهزة للتخصيص"],
  ["CNT-120", 20, "rented", "حي الصحافة", "مؤجرة لعقد تجريبي"],
];

const containerIds = containers.map(([reference, size, status, location, notes], index) => ({
  reference,
  id: upsertRecord("container", reference, status, {
    assetCode: reference,
    containerCode: reference,
    typeName: `حاوية ${size} ياردة`,
    size: `${size} ياردة`,
    capacity: size === 12 ? "6 طن" : "15 طن",
    location,
    lastInspection: today,
    notes,
    testData: true,
    sequence: index + 1,
  }),
}));

console.log(JSON.stringify({
  drivers: driverIds,
  containers: containerIds,
  summary: {
    drivers: drivers.length,
    containers: containers.length,
    twelveYard: containers.filter(([, size]) => size === 12).length,
    twentyYard: containers.filter(([, size]) => size === 20).length,
  },
}, null, 2));