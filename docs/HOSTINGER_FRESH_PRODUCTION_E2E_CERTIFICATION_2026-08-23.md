# شهادة التحقق الحي الشاملة — Hostinger Fresh Production E2E

**التاريخ:** 23 أغسطس 2026  
**البيئة:** الإنتاج الحي على Hostinger  
**الرابط:** https://hawiat.aiservx.com  
**نوع التحقق:** دورة تشغيل كاملة على بيانات إنتاجية آمنة وموسومة  
**البادئة المستخدمة لبيانات الاختبار:** `HOSTINGER-FRESH-E2E-2026`  
**الحكم النهائي:** `PASS`  
**الدرجة:** `10/10`

> هذه الوثيقة هي المرجع التشغيلي الأحدث لشهادة دورة الإنتاج الحية. لا تحتوي على كلمات مرور أو أسرار أو رموز جلسات.

## 1. نطاق الشهادة

شملت الشهادة:

- تسجيل الدخول والصلاحيات وحماية المسارات.
- قاعدة بيانات SQLite الموجودة فعلياً على Hostinger.
- موقع CleanFlow والـ API ومسار نظام الحاويات.
- دورة العميل والموقع وجهة الاتصال والموظف والمستودع والمورد.
- دورة الطلب والعقد والفاتورة والتحصيل والإيصال والإيداع والمطابقة البنكية.
- المشتريات والمخزون والعمولات والمصروفات والإيرادات الأخرى والتحويلات.
- المرتجعات ومرتجعات السداد والقيود العكسية.
- الفترات المالية وقفل الفترة ومنع الترحيل داخل فترة مغلقة.
- منع التكرار باستخدام idempotency في Node وPHP.
- توازن القيد المزدوج وسلامة قاعدة البيانات.
- حجب ملفات البيانات والبيئة والمسارات الإدارية غير المصرح بها.
- تطابق مسار Node المحلي مع حزمة PHP/SQLite المرفوعة للإنتاج.

## 2. طريقة التنفيذ

تم تنفيذ التحقق بالترتيب التالي:

1. تسجيل الدخول بحساب إداري حقيقي في الإنتاج.
2. إنشاء بيانات Golden Dataset جديدة بالبادئة المحددة.
3. تنفيذ المسار التشغيلي من الطلب حتى العقد والفاتورة والتحصيل.
4. تنفيذ دورة الإيداع والمطابقة البنكية.
5. تنفيذ دورة المصروف والمشتريات والمخزون والعمولة والإيراد الآخر.
6. تنفيذ التحويل والمرتجع ومرتجع السداد والقيد العكسي.
7. تجربة مفاتيح idempotency بإعادة نفس الطلب.
8. إغلاق فترة مالية ومحاولة ترحيل جديدة داخلها.
9. قراءة المؤشرات المالية ومقارنة الدائن بالمدين.
10. تنزيل نسخة قاعدة الإنتاج عبر FTP وتشغيل `quick_check` و`integrity_check`.
11. إعادة فحص HTTP والأمان والبصمات بعد آخر رفع.

## 3. حالة النشر

| العنصر | الحالة |
|---|---|
| الموقع الحي | PASS — HTTP 200 |
| تسجيل دخول الإدارة | PASS |
| API PHP الإنتاجي | PASS |
| قاعدة SQLite الإنتاجية | PASS |
| Passive FTP | PASS |
| رفع `api/index.php` | PASS |
| رفع `api/container-system.php` | PASS |
| تشغيل API Server المحلي | RUNNING |
| تشغيل CleanFlow Services المحلي | RUNNING |
| تشغيل CleanFlow Platform المحلي | RUNNING |
| فحص TypeScript | PASS |
| فحص PHP syntax | PASS |
| فحص `git diff --check` | PASS |

## 4. Golden Dataset

جميع السجلات التالية أُنشئت أو تم التحقق منها باستخدام البادئة:

`HOSTINGER-FRESH-E2E-2026`

| الكيان | النتيجة |
|---|---|
| CUSTOMER | PASS |
| SITE | PASS |
| CONTACT | PASS |
| EMPLOYEE | PASS |
| WAREHOUSE | PASS |
| SUPPLIER | PASS |
| CASH TREASURY | PASS |
| BANK TREASURY | PASS |
| CONTAINER / ASSET | PASS |
| ASSIGNMENT | PASS |
| APPOINTMENT | PASS |

تمت إضافة `supplier` كنوع Master Data مستقل في Node وPHP، وإنشاء سجل مورد فعلي:

`HOSTINGER-FRESH-E2E-2026-SUPPLIER`

## 5. مصفوفة دورة الأعمال الحية

| العملية | النتيجة |
|---|---|
| ORDER → CONTRACT | PASS |
| CONTRACT IDEMPOTENCY | PASS |
| INVOICE | PASS |
| PAYMENT | PASS |
| PAYMENT IDEMPOTENCY | PASS |
| RECEIPT | PASS |
| DEPOSIT | PASS |
| DEPOSIT IDEMPOTENCY | PASS |
| BANK RECONCILIATION | PASS |
| EXPENSE | PASS |
| EXPENSE REVERSAL | PASS |
| PURCHASE | PASS |
| INVENTORY | PASS |
| COMMISSION | PASS |
| BANK FEE | PASS |
| BANK FEE IDEMPOTENCY | PASS |
| OTHER REVENUE | PASS |
| OTHER REVENUE IDEMPOTENCY | PASS |
| TRANSFER | PASS |
| REFUND | PASS |
| REFUND REVERSAL | PASS |
| PAYMENT RETURN | PASS |
| FINANCIAL PERIOD | PASS |
| PERIOD LOCK | PASS |

## 6. اختبارات منع التكرار

### العقد

- تم إرسال نفس العملية أكثر من مرة بنفس مفتاح العملية.
- تمت إعادة السجل الأصلي بدلاً من إنشاء عقد ثانٍ.
- النتيجة: `HTTP 200` مع `idempotent=true`.

### السداد

- تمت إعادة إرسال نفس مفتاح السداد.
- لم يتم إنشاء Payment أو Receipt أو Journal إضافي.
- النتيجة: PASS.

### الإيداع والمصروف والإيراد الآخر ورسوم البنك

- تمت إعادة اختبار كل عملية بمفتاحها.
- لم تتكرر السجلات أو الآثار المالية.
- النتيجة: PASS.

## 7. اختبار الفترة المغلقة

تم إغلاق الفترة الخاصة بتاريخ الحركة، ثم إرسال محاولة ترحيل جديدة داخل الفترة المغلقة.

النتيجة الصحيحة:

```text
HTTP 422
FINANCIAL_PERIOD_CLOSED
```

وتم التحقق من عدم إنشاء:

- Financial Transaction جديدة.
- Journal Entry جديدة.
- أي سجل مالي إضافي.
- أي تعديل مالي جانبي.

كما تم توحيد هذا السلوك بين Node وPHP؛ لم يعد الطلب يتحول بصمت إلى Draft.

## 8. المؤشرات المالية الحية

القيم التي أرجعتها طبقة الحقيقة المالية بعد الدورة:

| المؤشر | القيمة |
|---|---:|
| Cash and Bank | 1200 |
| Cash Balance | 25 |
| Bank Balance | 1175 |
| Gross Revenue | 1075 |
| Refunds | 0 |
| Net Revenue | 1075 |
| Gross Collections | 1150 |
| Returned Collections | 50 |
| Net Collections | 1100 |
| Expenses | 105 |
| Purchases | 200 |
| Inventory | 200 |
| Commissions | 80 |
| Bank Fees | 25 |
| Transfers | 0 |
| Profit | 970 |

### القيد المزدوج

```text
Total Debit:  4230
Total Credit: 4230
Difference:      0
```

- Journal Entries المرحّلة: `14`
- Journal Lines: `28`
- توازن المدين والدائن: PASS

## 9. المطابقة البنكية

- Deposit → Financial Transaction → Journal Entry → Reconciliation: PASS
- عدد سجلات المطابقة: `1`
- إعادة إرسال المطابقة لم تنشئ سجلاً إضافياً.
- تم منع ربط إيداع واحد بأكثر من سداد.
- تم التحقق من تطابق مبلغ الإيداع مع السداد المرتبط.

## 10. سلامة قاعدة البيانات

تم تنزيل `data/sabaik.db` من الإنتاج عبر FTP بعد آخر إضافة، ثم فحص النسخة:

```text
PRAGMA quick_check:     ok
PRAGMA integrity_check: ok
```

مؤشرات إضافية:

```text
bank_reconciliations: 1
golden suppliers:     1
posted debit:       4230
posted credit:      4230
```

## 11. فحوصات الأمان

| المسار | النتيجة |
|---|---|
| `/data/` | 403 |
| `/data/sabaik.db` | 403 |
| `/.env` | 403 |
| `/api/.env` | 403 |
| `/api/admin/container-system/records` بدون Token | 401 |

الملفات الحساسة غير متاحة للعامة، والمسارات الإدارية تطلب مصادقة.

## 12. بصمات الملفات الحية

البصمات التالية مأخوذة من الملفات الموجودة فعلياً على Hostinger بعد آخر رفع:

```text
api/index.php
25d6247773f4e22468f19e82b53ace1086646f839a6f8a1311c2c94519119454

api/container-system.php
63fe8958a360e283702437e988bcc70aab91a0afd3bc905940919841f4a99ac0

data/sabaik.db
16710f2b2f1d715719c0f1a0ccb1fbbb710071a98668e2cd66156830358e576e

cleanflow-platform/index.html
c04287c2d675d2cc0a8e9406d79e21124682302064c6c7c721327e6a4ebce4aa
```

## 13. الإصلاحات التي سبقت الاعتماد

### إصلاح idempotency للعقود

كانت بعض العقود القديمة تحفظ مفتاح العملية داخل JSON فقط، بينما كان المسار يبحث في عمود `operation_key` فقط. أدى ذلك إلى اختلاف بين الطلب الأول وإعادة الطلب.

تم إصلاح البحث ليغطي:

- عمود `operation_key`.
- قيمة `payload.operationKey`.
- Node وPHP معاً.

### إصلاح الترحيل في الفترات المغلقة

كان مسار PHP يحول بعض طلبات `posted` إلى `draft` بدلاً من رفضها. أصبح الآن:

- يفحص حالة الفترة قبل الإدراج.
- يرفض الترحيل داخل فترة مغلقة.
- يرجع `FINANCIAL_PERIOD_CLOSED`.
- يحافظ على عدم حدوث mutation.

### توحيد نوع المورد

تم تسجيل `supplier` ضمن الأنواع المدعومة في Node وPHP وإنشاء سجل مورد فعلي ضمن Golden Dataset.

## 14. أوامر إعادة التحقق

الأوامر المحلية الأساسية:

```bash
pnpm run typecheck
php -l scripts/api-index.php
php -l scripts/container-system.php
git diff --check
```

فحص قاعدة البيانات بعد تنزيلها:

```sql
PRAGMA quick_check;
PRAGMA integrity_check;
```

ولا يجوز تشغيل أوامر النشر قبل أخذ نسخة احتياطية من قاعدة الإنتاج.

## 15. ملاحظات تشغيلية لاحقة

- يجب إعادة تنفيذ دورة Golden Dataset بعد أي تغيير في Financial Truth أو idempotency أو PHP route parity.
- يجب الاحتفاظ ببصمات الملفات الحية بعد كل رفع.
- يجب عدم اعتبار نجاح TypeScript وحده شهادة مالية؛ الاعتماد يتطلب دورة بيانات ومطابقة وقاعدة فعلية.
- يجب إبقاء Node وPHP متساويين في قواعد الترحيل والفترة المغلقة والعكس ومنع التكرار.
- يجب عدم رفع أي ملف يحتوي على أسرار أو كلمات مرور أو قيم جلسات إلى التوثيق أو المستودع.

## 16. الاعتماد

```text
FINAL PRODUCTION CERTIFICATION: PASS
FINAL SCORE: 10/10
```

هذه الشهادة توثق دورة التحقق الحية المنفذة في 23 أغسطس 2026، وتستبدل الأحكام التشغيلية الأقدم التي سبقت إصلاحات الإنتاج واختبار البيانات الذهبية.