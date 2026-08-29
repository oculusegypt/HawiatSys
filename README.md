# مؤسسة تقي جروب — CleanFlow

منصة تشغيل وتسويق عربية لمؤسسة تقي جروب في الرياض. تجمع بين موقع الخدمات العامة ولوحة إدارة الطلبات والتشغيل ونظام الحاويات والعقود والتحصيل والتقارير.

## ما الذي يقدمه النظام؟

- استقبال طلبات خدمات التنظيف وتأجير الحاويات وتتبعها.
- إدارة العملاء والمواقع والأصول والحاويات والعقود والإيجارات.
- تعيين أوامر العمل للسائقين ومتابعة دورة التنفيذ ميدانيًا.
- حفظ إثبات التنفيذ: صورة، توقيع، اسم المستلم، وقت وموقع التنفيذ.
- إدارة الموظفين والأدوار والصلاحيات الدقيقة.
- إدارة الخدمات والباقات والمقالات وصفحات SEO والإعلانات والمراجعات.
- تجهيز صفحات SEO ومسودات المقالات من الكلمات المستهدفة عبر
  `pnpm --filter @workspace/scripts run prepare-seo-drafts`؛ التفاصيل في
  `docs/seo-keyword-drafts-2026-08-30.md`.
- تحليلات الزيارات ومصادرها والتحويلات، مع تصدير CSV وطباعة التقرير.
- التقارير المالية تعتمد على العلاقات الرسمية والتوزيعات الفعلية، مع حماية التكرار وقفل الفترات وسجل تدقيق قابل للمراجعة.
- محادثات الدعم، الإشعارات، واتساب، وإعدادات الموقع.
- حزمة نشر مستقلة لـ Hostinger تعمل عبر PHP وSQLite دون الاعتماد على Node.js في الإنتاج.
- قواعد التشغيل والصلاحيات والحركات موثقة في أدلة نظام الحاويات الحالية داخل `docs/`.

## التطبيقات

| التطبيق | المسار | الاستخدام |
|---|---|---|
| CleanFlow Services | `/` | الموقع العام، الخدمات، الباقات، الطلبات، المدونة والتتبع |
| CleanFlow Platform | `/cleanflow-platform/` | منصة التسويق/التشغيل المساندة |
| API Server | `/api` | واجهات البيانات والمصادقة والعمليات |
| Mockup Sandbox | `/__mockup` | معاينات التصميم والمكونات |

## التشغيل المحلي

يتطلب المشروع Node.js وpnpm. شغّل الخدمات من خلال إعدادات التشغيل الموجودة في المشروع، أو استخدم الأوامر التالية:

```bash
# الموقع العام
PORT=19770 BASE_PATH=/ pnpm --filter @workspace/cleanflow-services run dev

# خادم API
PORT=8080 pnpm --filter @workspace/api-server run dev

# منصة CleanFlow Platform
pnpm --filter @workspace/cleanflow-platform run dev
```

الأوامر المساعدة:

```bash
pnpm run typecheck
pnpm --filter @workspace/cleanflow-services run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/scripts run validate:operational
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
node scripts/build-hostinger.mjs
```

> لا تشغّل `pnpm dev` من جذر المشروع؛ كل تطبيق يملك خدمة تشغيل ومسار معاينة مستقلًا.

## البنية التقنية

- **الواجهة:** React 19، Vite، TypeScript، Tailwind CSS، Wouter، Framer Motion، Lucide.
- **الخادم:** Express 5، Zod، Drizzle ORM.
- **البيانات:** SQLite محلية في التطوير والإصدار المحمول إلى Hostinger.
- **الطلبات:** React Query hooks مولدة من عقد OpenAPI.
- **الصور والملفات:** مجلد `uploads/` في الإصدار الحالي، مع ضرورة تطبيق سياسة تخزين موحدة عند التوسع.
- **النشر:** أرشيف PHP/SQLite مستقل عبر `scripts/build-hostinger.mjs`.

## أهم المسارات

### الموقع العام

`/`، `/services`، `/containers`، `/packages`، `/areas`، `/blog`، `/contact`، `/faq`، `/chat`، `/track-order/:id`، `/page/:slug`.

### الإدارة

`/admin/login`، `/admin`، `/admin/requests`، `/admin/work-orders`، `/admin/conversations`، `/admin/notifications`، `/admin/employees`، `/admin/analytics`، `/admin/container-system`، `/admin/container-system/profile/customer/:id`، `/admin/container-system/profile/employee/:id`، `/admin/container-system/profile/container/:id`، `/admin/container-system/contract/:id/print`.

## الأدوار والصلاحيات

الأدوار المدعومة:

- `admin`: إدارة كاملة.
- `manager`: إدارة وتشغيل النظام وفق الصلاحيات الممنوحة.
- `customer_service`: المحادثات وخدمة العملاء والإشعارات.
- `requests_officer`: الطلبات والإشعارات.
- `driver`: أوامر العمل المخصصة للسائق فقط.

الصلاحية الظاهرة في القائمة ليست حماية بحد ذاتها؛ التحقق النهائي يجب أن يتم في API. مرجع نظام الحاويات الأمني هو:

`docs/container-system-security-and-operations.md`

## دورة العمل الرئيسية

```text
طلب العميل
  → التأهيل والعرض
  → العقد/الإيجار
  → حجز الموعد
  → أمر العمل
  → التسليم أو التنفيذ
  → الإثبات والتوقيع
  → التحصيل والفاتورة
  → الإغلاق والتدقيق
```

حالات أمر السائق الحالية:

`assigned → accepted → started → en_route → arrived → completed`

مع الرفض المسبب عند الحاجة. لا تعدّل حركة الحاوية القديمة؛ التصحيح يتم بحركة جديدة موثقة.

## التوثيق

- [توثيق حزمة Hostinger النهائية — 2026-08-29](docs/hostinger-build-2026-08-29.md)
- [دليل تشغيل وأمان نظام الحاويات](docs/container-system-security-and-operations.md)
- [خطة صيانة نظام الحاويات](docs/container-system-maintenance-plan.md)
- [دليل الحركات](docs/container-system-movements.md)
- [مواصفات المتطلبات](docs/REQUIREMENT_SPECIFICATION_FULL.md)

## النشر على Hostinger

```bash
node scripts/build-hostinger.mjs
```

ينتج الأرشيف `cleanflow-services-hostinger.zip`. يجب رفعه إلى `public_html` وفك ضغطه مع التأكد من تفعيل PHP 8.x وامتدادي `pdo_sqlite` و`sqlite3` وتهيئة صلاحيات `data/` و`uploads/`. راجع الدليل قبل كل نشر، وخذ نسخة احتياطية من قاعدة البيانات قبل أي تحديث.

## قواعد التطوير

1. ابدأ بعقد OpenAPI عند إضافة API جديدة، ثم أعد تشغيل codegen قبل استخدام الأنواع الجديدة.
2. استخدم hooks من `@workspace/api-client-react` في الواجهة.
3. لا تُخفِ أخطاء الحفظ أو فشل المزامنة؛ يجب أن تظهر النتيجة للمستخدم.
4. كل عملية مالية أو حركة تشغيلية يجب أن تكون قابلة للتدقيق وقابلة لإعادة المحاولة بأمان.
5. لا تعرض بيانات السائق أو الإثباتات في التتبع العام.
6. شغّل `pnpm run typecheck` قبل تسليم أي تغيير مؤثر.

## الحالة الحالية

آخر حزمة Hostinger موثقة في [تقرير البناء النهائي](docs/hostinger-build-2026-08-29.md)، وتشمل PHP 8.x وPDO SQLite، صفحات SSG، واجهة API، لوحة التشغيل، ونتائج بوابة SEO وفحص الأرشيف المستخرج.
