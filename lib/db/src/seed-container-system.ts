import { db } from "./index.js";
import { eq } from "drizzle-orm";
import { containerSystemAuditTable, containerSystemRecordsTable } from "./schema/containerSystem.js";
import { siteSettingsTable } from "./schema/settings.js";

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
  ["maintenance", "due", { reference: "MNT-DEMO-001", vehicleId: "ز ح ط 9012", serviceDate: daysFromNow(1), description: "تغيير زيت وفحص الإطارات والفرامل", cost: 1450, status: "مفتوحة" }],
  ["maintenance", "completed", { reference: "MNT-DEMO-002", vehicleId: "CNT-104", serviceDate: daysFromNow(-10), description: "إصلاح الباب الخلفي ودهان الحاوية", cost: 680, status: "مكتملة" }],
  ["receipt", "posted", { receiptNumber: "REC-2026-0091", customerName: "شركة البناء المتين", amount: 3000, paymentMethod: "تحويل بنكي", date: daysFromNow(-2) }],
  ["receipt", "posted", { receiptNumber: "REC-2026-0092", customerName: "عبدالله سالم العتيبي", amount: 875, paymentMethod: "شبكة", date: daysFromNow(-1) }],
  ["payment", "posted", { customerName: "شركة البناء المتين", contractNumber: "RNT-2026-001", amount: 3000, paymentMethod: "تحويل بنكي", date: daysFromNow(-2) }],
  ["expense", "posted", { reference: "EXP-DEMO-001", category: "وقود", description: "وقود رحلات التوصيل الأسبوعية", amount: 1280, date: daysFromNow(-1) }],
  ["expense", "posted", { reference: "EXP-DEMO-002", category: "صيانة", description: "قطع غيار شاحنة ز ح ط 9012", amount: 1450, date: daysFromNow(-3) }],
  ["deposit", "posted", { bankName: "مصرف الراجحي", depositNumber: "DEP-2026-044", amount: 3875, date: daysFromNow(-1), notes: "إيداع تحصيلات اليوم" }],
  ["alert", "open", { reference: "ALT-DEMO-001", title: "عقد يقترب من الانتهاء", severity: "عالية", dueDate: daysFromNow(2), status: "مفتوح", details: "العقد RNT-2026-003 يحتاج قرار تجديد أو استرجاع الحاوية." }],
  ["alert", "open", { reference: "ALT-DEMO-002", title: "صيانة مستحقة", severity: "متوسطة", dueDate: daysFromNow(1), status: "مفتوح", details: "المركبة ز ح ط 9012 متوقفة حتى إتمام الفحص." }],
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

const extendedDemo = [
  ["branch", "active", { reference: "BRN-DEMO-001", name: "فرع الرياض", address: "الرياض - الصناعية القديمة", managerName: "سالم العتيبي", phone: "0550001001" }],
  ["branch", "active", { reference: "BRN-DEMO-002", name: "فرع الدمام", address: "الدمام - حي الخالدية", managerName: "ناصر القحطاني", phone: "0550001002" }],
  ["employee", "active", { reference: "EMP-DEMO-001", name: "أحمد عبد العزيز", jobTitle: "مشرف تشغيل", branchName: "فرع الرياض", residencyNumber: "2456789012", residencyExpiry: daysFromNow(180), licenseExpiry: daysFromNow(90), medicalInsuranceExpiry: daysFromNow(120), passportExpiry: daysFromNow(300), salary: 6500 }],
  ["employee", "active", { reference: "EMP-DEMO-002", name: "خالد محمد الحربي", jobTitle: "سائق", branchName: "فرع الرياض", residencyNumber: "2456789013", residencyExpiry: daysFromNow(20), licenseExpiry: daysFromNow(-3), medicalInsuranceExpiry: daysFromNow(60), passportExpiry: daysFromNow(200), salary: 4800 }],
  ["permit", "active", { reference: "PRM-DEMO-001", permitNumber: "PRM-2026-1001", permitType: "تصريح تشغيل ونقل", vehiclePlate: "أ ب ج 1234", issueDate: daysFromNow(-300), expiryDate: daysFromNow(5) }],
  ["permit", "expired", { reference: "PRM-DEMO-002", permitNumber: "PRM-2025-0881", permitType: "تصريح نقل", vehiclePlate: "ز ح ط 9012", issueDate: daysFromNow(-400), expiryDate: daysFromNow(-12) }],
  ["appointment", "scheduled", { reference: "APT-DEMO-001", appointmentType: "تنزيل حاوية", customerName: "شركة البناء المتين", contractNumber: "RNT-2026-001", containerCode: "CNT-102", driverName: "يوسف ناصر القحطاني", vehiclePlate: "د هـ و 5678", appointmentDate: daysFromNow(1), address: "الرياض - مشروع البناء المتين" }],
  ["appointment", "completed", { reference: "APT-DEMO-002", appointmentType: "تفريغ حاوية", customerName: "عبدالله سالم العتيبي", contractNumber: "RNT-2026-003", containerCode: "CNT-103", driverName: "خالد محمد الحربي", vehiclePlate: "أ ب ج 1234", appointmentDate: daysFromNow(-2), address: "الخرج - حي الصناعية" }],
  ["warehouse", "active", { reference: "WH-DEMO-001", name: "المستودع الرئيسي", location: "الرياض - الصناعية", managerName: "سالم العتيبي", itemCount: 42 }],
  ["warehouse", "active", { reference: "WH-DEMO-002", name: "مخزن الدمام", location: "الدمام - الخالدية", managerName: "ناصر القحطاني", itemCount: 18 }],
  ["category", "active", { reference: "CAT-DEMO-001", name: "أنقاض", unit: "حاوية", notes: "تصنيف مخلفات البناء والهدم" }],
  ["category", "active", { reference: "CAT-DEMO-002", name: "نفايات تجارية", unit: "حاوية", notes: "للمطاعم والمنشآت التجارية" }],
  ["category_size", "active", { reference: "SIZE-DEMO-001", categoryName: "أنقاض", size: "20 ياردة", price: 400 }],
  ["category_size", "active", { reference: "SIZE-DEMO-002", categoryName: "أنقاض", size: "12 ياردة", price: 300 }],
  ["treasury", "active", { reference: "TRS-DEMO-001", name: "الخزينة النقدية", treasuryType: "نقدية", openingBalance: 5000 }],
  ["treasury", "active", { reference: "TRS-DEMO-002", name: "حساب التحويلات البنكية", treasuryType: "تحويلات بنكية", accountNumber: "SA000000000001", openingBalance: 25000 }],
  ["transfer", "posted", { reference: "TRF-DEMO-001", fromTreasury: "حساب التحويلات البنكية", toTreasury: "الخزينة النقدية", amount: 5000, date: daysFromNow(-4), description: "تغذية الخزينة النقدية" }],
  ["invoice", "issued", { reference: "INV-DEMO-001", invoiceNumber: "INV-2026-0003", customerName: "محمود محمد", contractNumber: "RNT-DEMO-001", amount: 400, taxRate: 15, taxAmount: 60, total: 460, date: daysFromNow(-8), invoiceType: "فاتورة ضريبية مبسطة" }],
  ["invoice_return", "posted", { reference: "RET-DEMO-001", invoiceNumber: "INV-2026-0002", customerName: "مؤسسة مدار للمقاولات", amount: 120, date: daysFromNow(-5), reason: "إلغاء رحلة زائدة" }],
  ["tax", "active", { reference: "TAX-DEMO-001", name: "ضريبة القيمة المضافة", rate: 15, effectiveDate: daysFromNow(-365) }],
  ["commission", "active", { reference: "COM-DEMO-001", name: "عمولة المشرف", basis: "نسبة من قيمة العقد", rate: 2.5 }],
  ["oil_change", "due", { reference: "OIL-DEMO-001", vehiclePlate: "ز ح ط 9012", driverName: "—", mileage: 198700, oilType: "ديزل 15W40", nextDueMileage: 198500, date: daysFromNow(-40) }],
  ["oil_change", "completed", { reference: "OIL-DEMO-002", vehiclePlate: "أ ب ج 1234", driverName: "خالد محمد الحربي", mileage: 84200, oilType: "ديزل 15W40", nextDueMileage: 85000, date: daysFromNow(-10) }],
  ["salary_advance", "open", { reference: "ADV-DEMO-001", employeeName: "أحمد عبد العزيز", amount: 1000, date: daysFromNow(-12), deductionDate: daysFromNow(18), notes: "سلفة شهرية" }],
  ["salary_payment", "posted", { reference: "SAL-DEMO-001", employeeName: "خالد محمد الحربي", month: "2026-08", amount: 4800, paymentDate: daysFromNow(-2) }],
  ["fuel_expense", "posted", { reference: "FUEL-DEMO-001", vehiclePlate: "د هـ و 5678", driverName: "يوسف ناصر القحطاني", fuelType: "ديزل", quantity: 185, amount: 740, date: daysFromNow(-1) }],
  ["daily_expense", "posted", { reference: "DEX-DEMO-001", name: "مستلزمات تشغيل", expenseType: "مصروف عام", amount: 350, date: daysFromNow(-1), notes: "شراء مستلزمات تحميل وتثبيت" }],
  ["contract", "returned", { reference: "RNT-DEMO-001", contractNumber: "25111195", rentType: "عقد أنقاض", customerName: "محمود محمد", customerPhone: "0531941416", containerCode: "1002", category: "أنقاض", size: "20 ياردة", trips: 4, location: "الدمام", startDate: daysFromNow(-280), endDate: daysFromNow(-275), amount: 1600, taxRate: 15, taxAmount: 208.7, total: 1808.7, paid: 1000, remaining: 808.7, notes: "عقد متعدد الرحلات - بيانات مأخوذة من نموذج التشغيل" }],
  ["invoice", "issued", { reference: "INV-DEMO-002", invoiceNumber: "#3", customerName: "محمود محمد", contractNumber: "25111195", amount: 400, taxRate: 15, taxAmount: 60, total: 460, date: daysFromNow(-280), invoiceType: "فاتورة ضريبية مبسطة", itemName: "أنقاض 20 ياردة", quantity: 1, issuedBy: "مؤسسة البدر لتأجير الحاويات" }],
  ["container_movement", "completed", { reference: "MOV-DEMO-003", contractNumber: "25111195", containerCode: "1002", movementType: "تفريغ حاوية", vehiclePlate: "أ ب ج 1234", driverName: "أحمد عبد العزيز", supervisorName: "عبدالله البشار", movementDate: daysFromNow(-280), location: "الدمام" }],
  ["container_movement", "completed", { reference: "MOV-DEMO-004", contractNumber: "25111195", containerCode: "1002", movementType: "سحب حاوية", vehiclePlate: "أ ب ج 1234", driverName: "أحمد عبد العزيز", supervisorName: "عبدالله البشار", movementDate: daysFromNow(-275), location: "الدمام" }],
  ["payment", "posted", { reference: "PAY-DEMO-001", customerName: "محمود محمد", contractNumber: "25111195", amount: 1000, paymentMethod: "نقدي", date: daysFromNow(-275), paidUntil: daysFromNow(-275), treasury: "الخزينة النقدية", notes: "سداد جزئي" }],
  ["ledger_entry", "open", { reference: "LED-DEMO-003", contractNumber: "25111195", customerName: "محمود محمد", direction: "مدين", amount: 808.7, date: daysFromNow(-274), description: "الرصيد المتبقي بعد السداد الجزئي", dueDate: daysFromNow(-240) }],
  ["alert", "open", { reference: "ALT-DEMO-001", title: "مديونية متأخرة", severity: "عالية", dueDate: daysFromNow(-240), status: "مفتوح", details: "العميل محمود محمد لديه رصيد متبقٍ على العقد 25111195." }],
] as const;

// This command is deliberately deterministic: it is the development/demo reset
// for the whole container system, not an additive fixture that accumulates rows.
{
  db.delete(containerSystemAuditTable).run();
  db.delete(containerSystemRecordsTable).run();

  const organizationSettings = {
    company_name: "مؤسسة تقي جروب",
    company_name_en: "Taqi Group Establishment",
    company_phone_call: "0536312121",
    company_phone_whatsapp: "0536312121",
    company_phones: JSON.stringify(["0536312121"]),
    company_email: "",
    company_address: "6793 حمزة بن عبدالمطلب",
    company_city: "الرياض",
    company_region: "منطقة الحزم",
    company_country: "SA",
    company_postal_code: "14964",
    company_latitude: "24.5403799",
    company_longitude: "46.6506105",
    company_logo: "/api/uploads/1787336693429-1c5ead9d52d0.webp",
    company_tax_number: "",
    company_price_range: "400",
    company_payment_methods: "نقدي، مدى، فيزا، ماستركارد، تحويل بنكي",
    company_map_embed: "<iframe src=\"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3629.413183006425!2d46.6506105!3d24.5403799\" width=\"600\" height=\"450\" style=\"border:0;\" allowfullscreen=\"\" loading=\"lazy\"></iframe>",
    company_footer_description: "مؤسسة تقي جروب، خيارك الأمثل في عالم تأجير الحاويات ونقل الأنقاض. نقدم خدماتنا بجودة عالية وأسعار تنافسية لنكون شركاء نجاحك في مشاريعك الإنشائية.",
    site_desc: "مؤسسة تقي جروب لخدمات تأجير الحاويات ونقل الأنقاض ومخلفات البناء في الرياض.",
    site_public_url: "",
    seo_meta_description: "مؤسسة تقي جروب — تأجير الحاويات ونقل الأنقاض في الرياض. اتصل الآن: 0536312121",
    vapid_subject: "",
  };
  for (const [key, value] of Object.entries(organizationSettings)) {
    const existingSetting = db.select().from(siteSettingsTable).where(
      eq(siteSettingsTable.key, key),
    ).get();
    if (existingSetting) {
      db.update(siteSettingsTable).set({ value, updatedAt: new Date().toISOString() })
        .where(eq(siteSettingsTable.key, key)).run();
    } else {
      db.insert(siteSettingsTable).values({ key, value }).run();
    }
  }

  for (const [kind, status, payload] of [...demo, ...linkedDemo, ...extendedDemo]) {
    const payloadRecord = payload as Record<string, unknown>;
    const reference = String(payloadRecord.reference ?? `${kind.toUpperCase().slice(0, 4)}-DEMO`);
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
}

console.log(`✅ Rebuilt the container system demo dataset and synchronized organization settings.`);