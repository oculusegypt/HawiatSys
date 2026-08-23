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
  ["DEMO-CNT-12-01", 12, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["DEMO-CNT-12-02", 12, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["DEMO-CNT-12-03", 12, "rented", "مشروع الياسمين", "مؤجرة لعقد تجريبي"],
  ["DEMO-CNT-12-04", 12, "available", "مستودع الشمال", "تم الفحص"],
  ["DEMO-CNT-12-05", 12, "maintenance", "ورشة الرياض", "تحتاج فحص أبواب"],
  ["DEMO-CNT-12-06", 12, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["DEMO-CNT-12-07", 12, "busy", "في مهمة ميدانية", "مع السائق يوسف القحطاني"],
  ["DEMO-CNT-12-08", 12, "available", "مستودع الشمال", "جاهزة للتخصيص"],
  ["DEMO-CNT-12-09", 12, "available", "مستودع الرياض", "تم الفحص"],
  ["DEMO-CNT-12-10", 12, "rented", "حي النرجس", "مؤجرة لعقد تجريبي"],
  ["DEMO-CNT-20-01", 20, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["DEMO-CNT-20-02", 20, "available", "مستودع الرياض", "تم الفحص"],
  ["DEMO-CNT-20-03", 20, "rented", "مشروع الملقا", "مؤجرة لعقد تجريبي"],
  ["DEMO-CNT-20-04", 20, "available", "مستودع الجنوب", "جاهزة للتخصيص"],
  ["DEMO-CNT-20-05", 20, "maintenance", "ورشة الرياض", "تحتاج دهاناً خارجياً"],
  ["DEMO-CNT-20-06", 20, "available", "مستودع الرياض", "نظيفة وجاهزة"],
  ["DEMO-CNT-20-07", 20, "busy", "في مهمة ميدانية", "مع السائق خالد الحربي"],
  ["DEMO-CNT-20-08", 20, "available", "مستودع الجنوب", "تم الفحص"],
  ["DEMO-CNT-20-09", 20, "available", "مستودع الرياض", "جاهزة للتخصيص"],
  ["DEMO-CNT-20-10", 20, "rented", "حي الصحافة", "مؤجرة لعقد تجريبي"],
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