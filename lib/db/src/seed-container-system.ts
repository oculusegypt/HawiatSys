import { db } from "./index.js";
import { containerSystemAuditTable, containerSystemRecordsTable } from "./schema/containerSystem.js";

const existing = db.select().from(containerSystemRecordsTable).all();

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const signatureData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/8Y8X0QAAAABJRU5ErkJggg==";

const demo = [
  ["customer", "active", { name: "شركة البناء المتين", phone: "0501234567", city: "الرياض", taxNumber: "310123456700003", customerType: "شركة", balance: 4200 }],
  ["customer", "active", { name: "مؤسسة مدار للمقاولات", phone: "0557891234", city: "الخرج", taxNumber: "310987654300003", customerType: "مؤسسة", balance: 0 }],
  ["customer", "active", { name: "عبدالله سالم العتيبي", phone: "0534567890", city: "الرياض", customerType: "فرد", balance: 850 }],
  ["container_type", "active", { name: "حاوية أنقاض 10 ياردة", size: "10 ياردة", capacity: "8 طن", dailyRate: 180, taxRate: 15 }],
  ["container_type", "active", { name: "حاوية مخلفات 20 ياردة", size: "20 ياردة", capacity: "15 طن", dailyRate: 260, taxRate: 15 }],
  ["container_type", "active", { name: "حاوية مغلقة للنفايات", size: "12 ياردة", capacity: "6 طن", dailyRate: 220, taxRate: 15 }],
  ["container", "available", { assetCode: "CNT-101", typeName: "حاوية أنقاض 10 ياردة", location: "مستودع الرياض", lastInspection: daysFromNow(-8) }],
  ["container", "rented", { assetCode: "CNT-102", typeName: "حاوية مخلفات 20 ياردة", location: "مشروع البناء المتين", lastInspection: daysFromNow(-4) }],
  ["container", "available", { assetCode: "CNT-103", typeName: "حاوية مغلقة للنفايات", location: "مستودع الخرج", lastInspection: daysFromNow(-15) }],
  ["container", "maintenance", { assetCode: "CNT-104", typeName: "حاوية أنقاض 10 ياردة", location: "الورشة", lastInspection: daysFromNow(-45) }],
  ["driver", "available", { name: "خالد محمد الحربي", phone: "0541112233", license: "DL-88421", status: "متاح" }],
  ["driver", "busy", { name: "يوسف ناصر القحطاني", phone: "0562223344", license: "DL-77219", status: "في مهمة" }],
  ["driver", "available", { name: "سعد أحمد المطيري", phone: "0573334455", license: "DL-66310", status: "متاح" }],
  ["vehicle", "available", { plate: "أ ب ج 1234", model: "شاحنة قلابة - 2023", driverName: "خالد محمد الحربي", mileage: 84200 }],
  ["vehicle", "busy", { plate: "د هـ و 5678", model: "قلاب هيدروليك - 2022", driverName: "يوسف ناصر القحطاني", mileage: 126500 }],
  ["vehicle", "maintenance", { plate: "ز ح ط 9012", model: "شاحنة نقل - 2021", driverName: "—", mileage: 198700 }],
  ["contract", "active", { contractNumber: "RNT-2026-001", customerName: "شركة البناء المتين", customerPhone: "0501234567", containerCode: "CNT-102", startDate: daysFromNow(-6), endDate: daysFromNow(24), amount: 5200, taxRate: 15, taxAmount: 780, total: 5980, minimumPrice: 4500, minimumPriceApproved: "لا", signatureData, signedAt: new Date().toISOString() }],
  ["contract", "issued", { contractNumber: "RNT-2026-002", customerName: "مؤسسة مدار للمقاولات", customerPhone: "0557891234", containerCode: "CNT-101", startDate: daysFromNow(2), endDate: daysFromNow(16), amount: 2520, taxRate: 15, taxAmount: 378, total: 2898, minimumPrice: 2500, minimumPriceApproved: "لا", signatureData: "", notes: "بانتظار التسليم" }],
  ["contract", "expiring", { contractNumber: "RNT-2026-003", customerName: "عبدالله سالم العتيبي", customerPhone: "0534567890", containerCode: "CNT-103", startDate: daysFromNow(-25), endDate: daysFromNow(2), amount: 1500, taxRate: 15, taxAmount: 225, total: 1725, minimumPrice: 1500, minimumPriceApproved: "لا", signatureData, signedAt: new Date().toISOString() }],
  ["maintenance", "due", { vehicleId: "ز ح ط 9012", serviceDate: daysFromNow(1), description: "تغيير زيت وفحص الإطارات والفرامل", cost: 1450, status: "مفتوحة" }],
  ["maintenance", "completed", { vehicleId: "CNT-104", serviceDate: daysFromNow(-10), description: "إصلاح الباب الخلفي ودهان الحاوية", cost: 680, status: "مكتملة" }],
  ["receipt", "posted", { receiptNumber: "REC-2026-0091", customerName: "شركة البناء المتين", amount: 3000, paymentMethod: "تحويل بنكي", date: daysFromNow(-2) }],
  ["receipt", "posted", { receiptNumber: "REC-2026-0092", customerName: "عبدالله سالم العتيبي", amount: 875, paymentMethod: "شبكة", date: daysFromNow(-1) }],
  ["payment", "posted", { customerName: "شركة البناء المتين", contractNumber: "RNT-2026-001", amount: 3000, paymentMethod: "تحويل بنكي", date: daysFromNow(-2) }],
  ["expense", "posted", { category: "وقود", description: "وقود رحلات التوصيل الأسبوعية", amount: 1280, date: daysFromNow(-1) }],
  ["expense", "posted", { category: "صيانة", description: "قطع غيار شاحنة ز ح ط 9012", amount: 1450, date: daysFromNow(-3) }],
  ["deposit", "posted", { bankName: "مصرف الراجحي", depositNumber: "DEP-2026-044", amount: 3875, date: daysFromNow(-1), notes: "إيداع تحصيلات اليوم" }],
  ["alert", "open", { title: "عقد يقترب من الانتهاء", severity: "عالية", dueDate: daysFromNow(2), status: "مفتوح", details: "العقد RNT-2026-003 يحتاج قرار تجديد أو استرجاع الحاوية." }],
  ["alert", "open", { title: "صيانة مستحقة", severity: "متوسطة", dueDate: daysFromNow(1), status: "مفتوح", details: "المركبة ز ح ط 9012 متوقفة حتى إتمام الفحص." }],
  ["setting", "active", { key: "vat_rate", value: "15", section: "المالية", notes: "نسبة ضريبة القيمة المضافة الافتراضية" }],
  ["setting", "active", { key: "minimum_contract_price", value: "1500", section: "العقود", notes: "الحد الأدنى الافتراضي للعقد قبل اعتماد الاستثناء" }],
  ["setting", "active", { key: "late_return_grace_hours", value: "24", section: "التشغيل", notes: "ساعات السماح قبل احتساب تأخير" }],
] as const;

const linkedDemo = [
  ["contract_line", "active", { reference: "LINE-DEMO-001", contractNumber: "RNT-2026-001", serviceType: "توصيل الحاوية", containerCode: "CNT-102", quantity: 1, unitPrice: 4500, taxRate: 15, lineTotal: 5175 }],
  ["contract_line", "active", { reference: "LINE-DEMO-002", contractNumber: "RNT-2026-001", serviceType: "رفع واسترجاع", containerCode: "CNT-102", quantity: 2, unitPrice: 400, taxRate: 15, lineTotal: 920 }],
  ["container_movement", "delivered", { reference: "MOV-DEMO-001", contractNumber: "RNT-2026-001", containerCode: "CNT-102", movementType: "تسليم", vehiclePlate: "د هـ و 5678", driverName: "يوسف ناصر القحطاني", movementDate: daysFromNow(-6), location: "مشروع البناء المتين" }],
  ["container_movement", "returned", { reference: "MOV-DEMO-002", contractNumber: "RNT-2025-031", containerCode: "CNT-103", movementType: "استرجاع", vehiclePlate: "أ ب ج 1234", driverName: "خالد محمد الحربي", movementDate: daysFromNow(-2), location: "مستودع الخرج" }],
  ["ledger_entry", "open", { reference: "LED-DEMO-001", contractNumber: "RNT-2026-001", customerName: "شركة البناء المتين", direction: "مدين", amount: 2980, date: daysFromNow(-1), description: "الرصيد المتبقي بعد الدفعة الأولى" }],
  ["ledger_entry", "open", { reference: "LED-DEMO-002", contractNumber: "RNT-2026-003", customerName: "عبدالله سالم العتيبي", direction: "مدين", amount: 1725, date: daysFromNow(-1), description: "إجمالي عقد مستحق التحصيل" }],
] as const;

const identityKeys = ["reference", "name", "assetCode", "contractNumber", "plate", "receiptNumber", "depositNumber", "key"];
const isAlreadySeeded = (kind: string, payload: Record<string, unknown>) => existing.some(record => {
  if (record.kind !== kind) return false;
  const current = JSON.parse(record.payload) as Record<string, unknown>;
  if (payload.reference && current.reference === payload.reference) return true;
  return identityKeys.some(key => payload[key] && current[key] === payload[key]);
});

for (const [kind, status, payload] of [...demo, ...linkedDemo]) {
  const payloadRecord = payload as Record<string, unknown>;
  const reference = String(payloadRecord.reference ?? `${kind.toUpperCase().slice(0, 4)}-DEMO`);
  if (isAlreadySeeded(kind, payload as Record<string, unknown>)) continue;
  const created = db.insert(containerSystemRecordsTable).values({
    kind,
    status,
    reference,
    payload: JSON.stringify(payload),
  }).returning().get();
  db.insert(containerSystemAuditTable).values({
    recordId: created.id,
    kind,
    action: "seed_demo",
    afterPayload: created.payload,
  }).run();
}

console.log(`✅ Added missing container system demo records. Existing records were preserved.`);