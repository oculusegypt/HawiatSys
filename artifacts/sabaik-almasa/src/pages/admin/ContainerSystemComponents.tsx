import { useEffect, useRef, useState } from "react"
import type { ContainerSystemRecord } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PenLine, RotateCcw, Save, X } from "lucide-react"

export type RecordKind =
  | "customer"
  | "container_type"
  | "container"
  | "contract"
  | "contract_line"
  | "container_movement"
  | "ledger_entry"
  | "vehicle"
  | "maintenance"
  | "driver"
  | "receipt"
  | "payment"
  | "expense"
  | "deposit"
  | "alert"
  | "setting"
  | "branch"
  | "employee"
  | "permit"
  | "appointment"
  | "warehouse"
  | "treasury"
  | "transfer"
  | "invoice"
  | "invoice_return"
  | "category"
  | "category_size"
  | "tax"
  | "commission"
  | "oil_change"
  | "salary_advance"
  | "salary_payment"
  | "fuel_expense"
  | "daily_expense"

export const KIND_LABELS: Record<RecordKind, string> = {
  customer: "العملاء",
  container_type: "أنواع الحاويات",
  container: "الحاويات",
  contract: "العقود",
  contract_line: "تسجيل إيجار حاوية",
  container_movement: "التبديل والتفريغ",
  ledger_entry: "سجل المديونية",
  vehicle: "الشاحنات",
  maintenance: "الصيانة",
  driver: "السائقون",
  receipt: "سندات القبض",
  payment: "سداد العملاء",
  expense: "الإيرادات والمصروفات",
  deposit: "الإيداعات البنكية",
  alert: "التنبيهات اليومية",
  setting: "الإعدادات",
  branch: "الفروع",
  employee: "الموظفون",
  permit: "التصاريح",
  appointment: "المواعيد والحجوزات",
  warehouse: "المستودعات والمخازن",
  treasury: "الخزائن",
  transfer: "التحويل بين الخزائن",
  invoice: "الفواتير",
  invoice_return: "مرتجعات الفواتير",
  category: "تصنيفات الأصناف",
  category_size: "أحجام التصنيفات",
  tax: "الضرائب",
  commission: "أسعار العمولات",
  oil_change: "قراءات وتغيير الزيت",
  salary_advance: "الرواتب والسلف",
  salary_payment: "الرواتب والسلف",
  fuel_expense: "مصروفات السيارات",
  daily_expense: "المصروفات اليومية",
}

export const KIND_ICONS: Record<RecordKind, string> = {
  customer: "عميل",
  container_type: "نوع",
  container: "أصل",
  contract: "عقد",
  contract_line: "بند",
  container_movement: "حركة",
  ledger_entry: "قيد",
  vehicle: "مركبة",
  maintenance: "صيانة",
  driver: "سائق",
  receipt: "إيصال",
  payment: "تحصيل",
  expense: "مصروف",
  deposit: "إيداع",
  alert: "تنبيه",
  setting: "إعداد",
  branch: "فرع",
  employee: "موظف",
  permit: "تصريح",
  appointment: "موعد",
  warehouse: "مخزن",
  treasury: "خزينة",
  transfer: "تحويل",
  invoice: "فاتورة",
  invoice_return: "مرتجع",
  category: "تصنيف",
  category_size: "حجم",
  tax: "ضريبة",
  commission: "عمولة",
  oil_change: "زيت",
  salary_advance: "سلفة",
  salary_payment: "راتب",
  fuel_expense: "وقود",
  daily_expense: "مصروف يومي",
}

type FieldConfig = {
  key: string
  label: string
  placeholder?: string
  type?: "text" | "date" | "number" | "textarea"
  wide?: boolean
}

export const FIELD_CONFIG: Record<RecordKind, FieldConfig[]> = {
  customer: [
    { key: "name", label: "اسم العميل", placeholder: "شركة أو اسم العميل" },
    { key: "phone", label: "رقم الجوال", placeholder: "05xxxxxxxx", type: "text" },
    { key: "city", label: "المدينة", placeholder: "الرياض" },
    { key: "taxNumber", label: "الرقم الضريبي", placeholder: "اختياري" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  container_type: [
    { key: "name", label: "اسم النوع", placeholder: "حاوية أنقاض 20 ياردة" },
    { key: "size", label: "المقاس", placeholder: "6 × 2.4 × 1.8 م" },
    { key: "capacity", label: "السعة", placeholder: "15 طن" },
    { key: "dailyRate", label: "السعر اليومي", type: "number", placeholder: "0" },
    { key: "notes", label: "ملاحظات التشغيل", type: "textarea", wide: true },
  ],
  container: [
    { key: "assetCode", label: "رقم الأصل", placeholder: "CNT-204" },
    { key: "typeName", label: "نوع الحاوية", placeholder: "20 ياردة" },
    { key: "status", label: "حالة الأصل", placeholder: "متاح / مؤجر / صيانة" },
    { key: "location", label: "الموقع الحالي", placeholder: "مستودع الشفا" },
    { key: "lastInspection", label: "آخر فحص", type: "date" },
  ],
  contract: [
    { key: "requestId", label: "رقم الطلب المرتبط", placeholder: "معرّف طلب الخدمة" },
    { key: "customerRecordId", label: "معرّف سجل العميل", placeholder: "اختياري" },
    { key: "containerRecordId", label: "معرّف أصل الحاوية", placeholder: "اختياري" },
    { key: "contractNumber", label: "رقم العقد", placeholder: "CNT-2025-014" },
    { key: "customerName", label: "اسم العميل", placeholder: "اسم العميل" },
    { key: "customerPhone", label: "جوال العميل", placeholder: "05xxxxxxxx" },
    { key: "containerCode", label: "رقم الحاوية", placeholder: "CNT-204" },
    { key: "startDate", label: "بداية العقد", type: "date" },
    { key: "endDate", label: "نهاية العقد", type: "date" },
    { key: "amount", label: "قيمة العقد", type: "number", placeholder: "0" },
    { key: "taxRate", label: "نسبة الضريبة %", type: "number", placeholder: "15" },
    { key: "taxAmount", label: "قيمة الضريبة", type: "number", placeholder: "تحسب تلقائياً أو أدخلها" },
    { key: "total", label: "الإجمالي شامل الضريبة", type: "number", placeholder: "0" },
    { key: "minimumPrice", label: "الحد الأدنى للسعر", type: "number", placeholder: "0" },
    { key: "minimumPriceApproved", label: "استثناء سعري معتمد", placeholder: "نعم / لا" },
    { key: "status", label: "حالة العقد", placeholder: "مسودة / نشط / منتهٍ" },
    { key: "notes", label: "بنود وملاحظات", type: "textarea", wide: true },
  ],
  contract_line: [
    { key: "contractNumber", label: "رقم العقد", placeholder: "RNT-2026-001" },
    { key: "serviceType", label: "نوع الخدمة", placeholder: "توصيل / رفع / تبديل / نقل" },
    { key: "containerCode", label: "رقم الحاوية", placeholder: "CNT-101" },
    { key: "quantity", label: "الكمية", type: "number", placeholder: "1" },
    { key: "unitPrice", label: "سعر الوحدة", type: "number", placeholder: "0" },
    { key: "taxRate", label: "الضريبة %", type: "number", placeholder: "15" },
    { key: "lineTotal", label: "إجمالي البند", type: "number", placeholder: "0" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  container_movement: [
    { key: "contractNumber", label: "رقم العقد", placeholder: "RNT-2026-001" },
    { key: "containerCode", label: "رقم الحاوية", placeholder: "CNT-101" },
    { key: "movementType", label: "نوع الحركة", placeholder: "تسليم / استرجاع / تبديل / نقل" },
    { key: "vehiclePlate", label: "المركبة", placeholder: "أ ب ج 1234" },
    { key: "driverName", label: "السائق", placeholder: "اسم السائق" },
    { key: "movementDate", label: "تاريخ الحركة", type: "date" },
    { key: "location", label: "الموقع", placeholder: "العنوان أو الموقع" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  ledger_entry: [
    { key: "contractNumber", label: "رقم العقد", placeholder: "RNT-2026-001" },
    { key: "customerName", label: "العميل", placeholder: "اسم العميل" },
    { key: "direction", label: "نوع القيد", placeholder: "مدين / دائن" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "description", label: "البيان", type: "textarea", wide: true },
  ],
  vehicle: [
    { key: "plate", label: "لوحة المركبة", placeholder: "أ ب ج 1234" },
    { key: "model", label: "النوع والموديل", placeholder: "شاحنة نقل" },
    { key: "driverName", label: "السائق المسؤول", placeholder: "اسم السائق" },
    { key: "status", label: "الحالة", placeholder: "جاهزة / في مهمة / صيانة" },
    { key: "mileage", label: "عداد الكيلومترات", type: "number", placeholder: "0" },
  ],
  maintenance: [
    { key: "vehicleId", label: "المركبة", placeholder: "رقم أو لوحة المركبة" },
    { key: "serviceDate", label: "تاريخ الصيانة", type: "date" },
    { key: "description", label: "وصف العمل", type: "textarea", wide: true },
    { key: "cost", label: "التكلفة", type: "number", placeholder: "0" },
    { key: "status", label: "الحالة", placeholder: "مفتوحة / مكتملة" },
  ],
  driver: [
    { key: "name", label: "اسم السائق", placeholder: "الاسم الرباعي" },
    { key: "phone", label: "رقم الجوال", placeholder: "05xxxxxxxx" },
    { key: "license", label: "رقم الرخصة", placeholder: "رقم رخصة القيادة" },
    { key: "status", label: "الحالة", placeholder: "متاح / في مهمة / موقوف" },
  ],
  receipt: [
    { key: "receiptNumber", label: "رقم الإيصال", placeholder: "REC-001" },
    { key: "customerName", label: "العميل", placeholder: "اسم العميل" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "paymentMethod", label: "طريقة الدفع", placeholder: "تحويل / شبكة / نقدي" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  payment: [
    { key: "customerName", label: "العميل", placeholder: "اسم العميل" },
    { key: "contractNumber", label: "العقد", placeholder: "رقم العقد" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "paymentMethod", label: "طريقة الدفع", placeholder: "تحويل / شبكة / نقدي" },
    { key: "date", label: "التاريخ", type: "date" },
  ],
  expense: [
    { key: "category", label: "بند المصروف", placeholder: "وقود / صيانة / تشغيل" },
    { key: "description", label: "البيان", placeholder: "وصف المصروف" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  deposit: [
    { key: "bankName", label: "البنك", placeholder: "اسم البنك" },
    { key: "depositNumber", label: "رقم الإيداع", placeholder: "DEP-001" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  alert: [
    { key: "title", label: "عنوان التنبيه", placeholder: "انتهاء عقد أو موعد صيانة" },
    { key: "severity", label: "الأولوية", placeholder: "عالية / متوسطة / منخفضة" },
    { key: "dueDate", label: "التاريخ المستهدف", type: "date" },
    { key: "status", label: "الحالة", placeholder: "مفتوح / تمت المعالجة" },
    { key: "details", label: "التفاصيل", type: "textarea", wide: true },
  ],
  setting: [
    { key: "key", label: "اسم الإعداد", placeholder: "مدة السماح بالتأخير" },
    { key: "value", label: "القيمة", placeholder: "24 ساعة" },
    { key: "section", label: "القسم", placeholder: "التشغيل / المالية / العقود" },
    { key: "notes", label: "شرح الإعداد", type: "textarea", wide: true },
  ],
  branch: [
    { key: "name", label: "اسم الفرع", placeholder: "الفرع الرئيسي" },
    { key: "address", label: "العنوان", placeholder: "المدينة والحي" },
    { key: "managerName", label: "مدير الفرع", placeholder: "اسم المدير" },
    { key: "phone", label: "هاتف الفرع", placeholder: "05xxxxxxxx" },
    { key: "logoUrl", label: "رابط الشعار", placeholder: "رابط صورة الشعار" },
  ],
  employee: [
    { key: "name", label: "اسم الموظف", placeholder: "الاسم الرباعي" },
    { key: "jobTitle", label: "الوظيفة", placeholder: "سائق / محاسب / مشرف" },
    { key: "branchName", label: "الفرع", placeholder: "الفرع الرئيسي" },
    { key: "residencyNumber", label: "رقم الإقامة", placeholder: "رقم الإقامة" },
    { key: "residencyExpiry", label: "انتهاء الإقامة", type: "date" },
    { key: "licenseExpiry", label: "انتهاء الرخصة", type: "date" },
    { key: "medicalInsuranceExpiry", label: "انتهاء التأمين الطبي", type: "date" },
    { key: "passportExpiry", label: "انتهاء جواز السفر", type: "date" },
    { key: "salary", label: "الراتب", type: "number", placeholder: "0" },
  ],
  permit: [
    { key: "permitNumber", label: "رقم التصريح", placeholder: "رقم التصريح" },
    { key: "permitType", label: "نوع التصريح", placeholder: "تصريح نقل / تشغيل" },
    { key: "vehiclePlate", label: "المركبة", placeholder: "لوحة المركبة" },
    { key: "issueDate", label: "تاريخ الإصدار", type: "date" },
    { key: "expiryDate", label: "تاريخ الانتهاء", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  appointment: [
    { key: "appointmentType", label: "نوع الموعد", placeholder: "تنزيل / تفريغ" },
    { key: "customerName", label: "العميل", placeholder: "اسم العميل" },
    { key: "contractNumber", label: "العقد", placeholder: "رقم العقد" },
    { key: "containerCode", label: "الحاوية", placeholder: "رقم الحاوية" },
    { key: "driverName", label: "السائق", placeholder: "اسم السائق" },
    { key: "vehiclePlate", label: "المركبة", placeholder: "لوحة المركبة" },
    { key: "appointmentDate", label: "تاريخ الموعد", type: "date" },
    { key: "address", label: "العنوان", placeholder: "موقع التنفيذ" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  warehouse: [
    { key: "name", label: "اسم المستودع", placeholder: "المستودع الرئيسي" },
    { key: "location", label: "الموقع", placeholder: "المدينة والحي" },
    { key: "managerName", label: "المسؤول", placeholder: "اسم المسؤول" },
    { key: "itemCount", label: "عدد الأصناف", type: "number", placeholder: "0" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  treasury: [
    { key: "name", label: "اسم الخزينة", placeholder: "الخزينة النقدية" },
    { key: "treasuryType", label: "النوع", placeholder: "نقدية / تحويلات بنكية" },
    { key: "accountNumber", label: "رقم الحساب", placeholder: "اختياري" },
    { key: "openingBalance", label: "الرصيد الافتتاحي", type: "number", placeholder: "0" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  transfer: [
    { key: "fromTreasury", label: "من خزينة", placeholder: "الخزينة المصدر" },
    { key: "toTreasury", label: "إلى خزينة", placeholder: "الخزينة المستلمة" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "description", label: "البيان", type: "textarea", wide: true },
  ],
  invoice: [
    { key: "invoiceNumber", label: "رقم الفاتورة", placeholder: "INV-001" },
    { key: "customerName", label: "العميل", placeholder: "اسم العميل" },
    { key: "contractNumber", label: "العقد", placeholder: "رقم العقد" },
    { key: "amount", label: "المبلغ قبل الضريبة", type: "number", placeholder: "0" },
    { key: "taxRate", label: "نسبة الضريبة %", type: "number", placeholder: "15" },
    { key: "total", label: "الإجمالي", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  invoice_return: [
    { key: "invoiceNumber", label: "رقم الفاتورة الأصلية", placeholder: "INV-001" },
    { key: "customerName", label: "العميل", placeholder: "اسم العميل" },
    { key: "amount", label: "قيمة المرتجع", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "reason", label: "سبب المرتجع", type: "textarea", wide: true },
  ],
  category: [
    { key: "name", label: "اسم التصنيف", placeholder: "أنقاض / نفايات" },
    { key: "unit", label: "وحدة القياس", placeholder: "قطعة / طن" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  category_size: [
    { key: "categoryName", label: "التصنيف", placeholder: "أنقاض" },
    { key: "size", label: "الحجم", placeholder: "20 ياردة" },
    { key: "price", label: "السعر", type: "number", placeholder: "0" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  tax: [
    { key: "name", label: "اسم الضريبة", placeholder: "ضريبة القيمة المضافة" },
    { key: "rate", label: "النسبة %", type: "number", placeholder: "15" },
    { key: "effectiveDate", label: "تاريخ التطبيق", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  commission: [
    { key: "name", label: "اسم العمولة", placeholder: "عمولة الوسيط" },
    { key: "basis", label: "أساس الاحتساب", placeholder: "نسبة / مبلغ ثابت" },
    { key: "rate", label: "القيمة", type: "number", placeholder: "0" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  oil_change: [
    { key: "vehiclePlate", label: "المركبة", placeholder: "لوحة المركبة" },
    { key: "driverName", label: "السائق", placeholder: "اسم السائق" },
    { key: "mileage", label: "قراءة العداد", type: "number", placeholder: "0" },
    { key: "oilType", label: "نوع الزيت", placeholder: "نوع الزيت" },
    { key: "nextDueMileage", label: "القراءة القادمة", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
  ],
  salary_advance: [
    { key: "employeeName", label: "الموظف", placeholder: "اسم الموظف" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "deductionDate", label: "تاريخ الخصم", type: "date" },
    { key: "notes", label: "البيان", type: "textarea", wide: true },
  ],
  salary_payment: [
    { key: "employeeName", label: "الموظف", placeholder: "اسم الموظف" },
    { key: "month", label: "الشهر", placeholder: "2026-08" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "paymentDate", label: "تاريخ الدفع", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
  fuel_expense: [
    { key: "vehiclePlate", label: "المركبة", placeholder: "لوحة المركبة" },
    { key: "driverName", label: "السائق", placeholder: "اسم السائق" },
    { key: "fuelType", label: "نوع الوقود", placeholder: "ديزل / بنزين" },
    { key: "quantity", label: "الكمية", type: "number", placeholder: "0" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
  ],
  daily_expense: [
    { key: "name", label: "اسم المصروف", placeholder: "وقود / صيانة / تشغيل" },
    { key: "expenseType", label: "نوع المصروف", placeholder: "عام / سيارة" },
    { key: "amount", label: "المبلغ", type: "number", placeholder: "0" },
    { key: "date", label: "التاريخ", type: "date" },
    { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
  ],
}

const emptyPayload = (kind: RecordKind) =>
  Object.fromEntries(FIELD_CONFIG[kind].map(field => [field.key, ""])) as Record<string, string>

export function formatRecordDate(value?: string) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  } catch {
    return value
  }
}

export function amountOf(record: ContainerSystemRecord) {
  const value = Number(record.payload.amount ?? record.payload.dailyRate ?? record.payload.cost ?? 0)
  return Number.isFinite(value) ? value : 0
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشط", available: "متاحة", reserved: "محجوزة", rented: "مؤجرة", in_transit: "في الطريق",
  with_customer: "لدى العميل", awaiting_return: "بانتظار الاسترجاع", inspection: "تحت الفحص",
  maintenance: "في الصيانة", damaged: "تالفة", lost: "مفقودة", out_of_service: "خارج الخدمة",
  busy: "في مهمة", due: "مستحقة", overdue: "متأخرة", completed: "مكتملة", open: "مفتوحة",
  posted: "مرحّلة", issued: "صادر", scheduled: "مجدول", delivered: "تم التسليم", returned: "تم الاسترجاع",
  expiring: "تنتهي قريبًا", archived: "مؤرشف", pending: "قيد الانتظار", draft: "مسودة", cancelled: "ملغى",
  closed: "مغلق", settled: "مصفى", delinquent: "مديونية", approved: "معتمد", rejected: "مرفوض",
  "في مهمة": "في مهمة", "مفتوحة": "مفتوحة", "مكتملة": "مكتملة", "متاح": "متاح", "متاحة": "متاحة",
  "مؤجر": "مؤجرة", "مؤجرة": "مؤجرة", "صيانة": "في الصيانة",
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: "إضافة", update: "تعديل", archive: "أرشفة", seed_demo: "بيانات تجريبية",
  movement_sync: "مزامنة حركة", status_change: "تغيير حالة", settle: "تصفية", close: "إغلاق",
}

export function formatStatus(status?: string) {
  if (!status) return "غير محددة"
  const trimmed = status.trim()
  return STATUS_LABELS[trimmed] ?? STATUS_LABELS[trimmed.toLowerCase()] ?? trimmed
}

export function formatAuditAction(action?: string) {
  if (!action) return "عملية"
  return AUDIT_ACTION_LABELS[action] ?? action
}

export const STATUS_OPTIONS = [
  ["active", "نشط"], ["available", "متاح"], ["reserved", "محجوز"], ["rented", "مؤجر"],
  ["in_transit", "في الطريق"], ["with_customer", "لدى العميل"], ["awaiting_return", "بانتظار الاسترجاع"],
  ["inspection", "تحت الفحص"], ["maintenance", "في الصيانة"], ["damaged", "تالف"], ["lost", "مفقود"],
  ["out_of_service", "خارج الخدمة"], ["busy", "في مهمة"], ["due", "مستحقة"], ["overdue", "متأخرة"],
  ["completed", "مكتملة"], ["open", "مفتوحة"], ["posted", "مرحّلة"], ["issued", "صادر"],
  ["scheduled", "مجدول"], ["delivered", "تم التسليم"], ["returned", "تم الاسترجاع"],
  ["expiring", "تنتهي قريباً"], ["archived", "مؤرشف"], ["pending", "قيد الانتظار"],
  ["draft", "مسودة"], ["cancelled", "ملغى"], ["closed", "مغلق"], ["settled", "مصفى"],
  ["delinquent", "مديونية"], ["approved", "معتمد"], ["rejected", "مرفوض"],
] as const

export function statusTone(status?: string) {
  const normalized = (status ?? "").toLowerCase()
  if (["active", "available", "متاح", "نشط", "جاهزة", "مكتملة", "تمت المعالجة"].some(item => normalized.includes(item))) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
  if (["maintenance", "صيانة", "pending", "مسودة", "مفتوح", "في مهمة"].some(item => normalized.includes(item))) {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }
  if (["archived", "expired", "منتهي", "موقوف"].some(item => normalized.includes(item))) {
    return "bg-slate-100 text-slate-600 border-slate-200"
  }
  return "bg-sky-50 text-sky-700 border-sky-200"
}

function SignaturePad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const image = new Image()
    image.onload = () => canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.src = value
  }, [value])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }
  }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d")
    const p = point(event)
    if (!ctx || !p) return
    drawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext("2d")
    const p = point(event)
    if (!ctx || !p) return
    ctx.lineWidth = 2.4
    ctx.lineCap = "round"
    ctx.strokeStyle = "#164e63"
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }
  const end = () => {
    drawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL("image/png"))
  }
  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onChange("")
    }
  }
  return (
    <div className="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold text-cyan-900"><PenLine size={14} /> التوقيع الإلكتروني</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 gap-1 text-xs text-slate-500" data-testid="button-clear-signature"><RotateCcw size={12} /> مسح</Button>
      </div>
      <canvas
        ref={canvasRef}
        width={700}
        height={170}
        className="h-32 w-full touch-none rounded-xl border border-cyan-100 bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        data-testid="canvas-contract-signature"
      />
      <p className="mt-2 text-[11px] text-slate-500">وقّع داخل المساحة، ثم احفظ العقد.</p>
    </div>
  )
}

export function RecordDialog({
  open,
  kind,
  record,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  kind: RecordKind
  record?: ContainerSystemRecord | null
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Record<string, unknown>, status: string) => void
}) {
  const [payload, setPayload] = useState<Record<string, string>>(emptyPayload(kind))
  const [status, setStatus] = useState("active")

  useEffect(() => {
    if (!open) return
    const initial = emptyPayload(kind)
    Object.entries(record?.payload ?? {}).forEach(([key, value]) => { initial[key] = String(value ?? "") })
    setPayload(initial)
    setStatus(record?.status || "active")
  }, [open, kind, record])

  const setValue = (key: string, value: string) => setPayload(current => ({ ...current, [key]: value }))
  const fields = FIELD_CONFIG[kind]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl border-cyan-100 p-0">
        <DialogHeader className="border-b border-slate-100 bg-slate-50/80 p-6 text-right">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800"><PenLine size={20} /></div>
            <div>
              <DialogTitle className="text-xl text-slate-900">{record ? "تعديل السجل" : kind === "contract" ? "تسجيل تعاقد" : kind === "contract_line" ? "تسجيل إيجار حاوية" : `إضافة ${KIND_LABELS[kind]}`}</DialogTitle>
              <DialogDescription className="mt-1">سجل تشغيلي محفوظ مباشرة في نظام الحاويات.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={event => { event.preventDefault(); onSubmit(payload, status) }} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(field => (
              <div key={field.key} className={field.wide ? "sm:col-span-2" : ""}>
                <Label htmlFor={`record-${field.key}`} className="mb-1.5 block text-xs font-bold text-slate-600">{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea id={`record-${field.key}`} value={payload[field.key] ?? ""} onChange={event => setValue(field.key, event.target.value)} placeholder={field.placeholder} rows={3} data-testid={`textarea-record-${field.key}`} />
                ) : (
                  <Input id={`record-${field.key}`} type={field.type ?? "text"} value={payload[field.key] ?? ""} onChange={event => setValue(field.key, event.target.value)} placeholder={field.placeholder} dir={field.key.toLowerCase().includes("phone") || field.type === "number" ? "ltr" : "rtl"} data-testid={`input-record-${field.key}`} />
                )}
              </div>
            ))}
            <div className={kind === "contract" ? "" : "sm:col-span-2"}>
              <Label htmlFor="record-status" className="mb-1.5 block text-xs font-bold text-slate-600">حالة السجل</Label>
              <select id="record-status" value={status} onChange={event => setStatus(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-700" data-testid="select-record-status">
                {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          {kind === "contract" && <SignaturePad value={payload.signatureData ?? ""} onChange={value => setValue("signatureData", value)} />}
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-2" data-testid="button-cancel-record"><X size={15} /> إلغاء</Button>
            <Button type="submit" disabled={busy} className="gap-2 bg-cyan-800 hover:bg-cyan-900" data-testid="button-save-record"><Save size={15} /> {busy ? "جارٍ الحفظ..." : "حفظ السجل"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RecordStatus({ status }: { status?: string }) {
  return <Badge variant="outline" className={`font-bold ${statusTone(status)}`} data-testid={`status-record-${status ?? "unknown"}`}>{formatStatus(status)}</Badge>
}