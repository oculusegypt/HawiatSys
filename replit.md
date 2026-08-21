# مؤسسة سبائك الماسة — شركة تنظيف بالرياض (CleanFlow Services + CleanFlow Platform)

موقع شركة **سبائك الماسة** المتخصصة في خدمات التنظيف الشامل والنظافة المتقدمة بالرياض (تنظيف منازل، فلل، قصور، شقق، مجالس بالبخار، جلي رخام وسيراميك، غسيل مكيفات، تطهير خزانات، ومكافحة حشرات) مع لوحة إدارة متكاملة ومؤتمتة للطلبات والعمليات والفريق.

## التشغيل السريع (Run & Operate)

- **الواجهة الأمامية (Frontend)** (المينا: 19770): `PORT=19770 BASE_PATH=/ pnpm --filter @workspace/cleanflow-services run dev`
- **خادم الـ API** (المينا: 8080): `PORT=8080 pnpm --filter @workspace/api-server run dev`
- **مخطط قاعدة البيانات**: `pnpm --filter @workspace/db run push`
- **إعادة تعبئة البيانات**: `pnpm --filter @workspace/db run seed`
- **فحص الأنواع (Typecheck)**: `pnpm run typecheck`
- **البناء الموحد لهوستنجر (Build Archive)**: `node scripts/build-hostinger.mjs`

## قاعدة البيانات (Database Architecture)

- **النوع**: SQLite3 (مدمجة ومحليّة) — `data/sabaik.db`
- **محرك الاستعلام**: Drizzle ORM (`drizzle-orm/better-sqlite3`)
- **الجداول الأساسية**:
  - `services`: 10 خدمات تنظيف رسمية مع seo_slug عربي
  - `containers`: 12 باقة تنظيف مستقلة بالرياض (بدون أسعار ثابتة)
  - `service_requests`: طلبات العملاء مع تفاصيل العدادات، المكونات، والخدمات الإضافية
  - `blog_posts`: 22 مقالة SEO مهيأة لمحركات البحث والذكاء الاصطناعي
  - `employees` & `work_orders`: إدارة الفريق وأوامر العمل والسائقين
  - `site_settings`: إعدادات قفل الطلبات والواتساب والشركة

## التكنولوجيا المستخدمة (Tech Stack)

- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4 + Wouter + Framer Motion + Lucide Icons + Leaflet
- **Backend API**: Express 5 + Drizzle ORM + Zod
- **Build & SSG**: Node.js SSG Pre-rendering (توليد 46 صفحة HTML ثابتة جاهزة للأرشفة الفورية)

## الهيكلية البرمجية للمشروع (Project Structure)

```text
src/
├── components/
│   ├── admin/requests/
│   │   ├── RequestsStatsGrid.tsx
│   │   ├── RequestsTable.tsx
│   │   └── RequestDetailModal.tsx
│   ├── home/
│   │   ├── packages/
│   │   │   ├── CategoryTabs.tsx
│   │   │   └── PackageCard.tsx
│   │   ├── services/
│   │   │   └── ServiceCard.tsx
│   │   └── request-modal/
│   │       ├── types.ts
│   │       ├── constants.ts
│   │       └── StepServiceSelect.tsx
│   └── common/
│       └── ScrollToTop.tsx
└── routes/
    ├── AdminRoutes.tsx
    └── PublicRoutes.tsx
```

## لوحة الإدارة (Admin Panel)

- **الرابط**: `/admin/login`
- **منصة التشغيل التسويقية**: `/cleanflow-platform/` — CleanFlow Platform
- **الأدوار**: `admin`, `manager`, `customer_service`, `requests_officer`, `driver`
- **الخدمات المتاحة**: متابعة الطلبات، تعيين أوامر العمل، إدارة المقالات والخدمات والباقات، الإشعارات، والتحليلات.

## النشر على Hostinger

### قيد التشغيل المؤكد

بيئة Hostinger المستهدفة **لا تدعم تشغيل Node.js أو npm أو PM2 في الإنتاج**. لذلك:

- Node.js وVite وDrizzle تُستخدم محلياً فقط لبناء وتجهيز الأرشيف.
- الخادم المرفوع إلى Hostinger يعمل حصراً عبر **PHP 8.x + PDO SQLite**.
- جميع مسارات API، تسجيل الدخول، المدونة، نظام الحاويات، إدارة الطلبات، وقراءة/تعديل قاعدة البيانات يجب أن تكون موجودة في `api/index.php` وملفات PHP المساندة.
- لا يجوز أن يعتمد الموقع المرفوع على Express أو خادم Node أو اتصال بخدمة Replit.
- الأرشيف الكامل يجب أن يحتوي على `index.html` و`api/` و`data/` و`uploads/` في جذر الأرشيف، ليتم استخراجها مباشرة داخل `public_html`.

يتم بناء أرشيف رفع جاهز يحتوي على PHP + SQLite مدمجة من خلال الأمر:
```bash
node scripts/build-hostinger.mjs
```
ينتج الملف **`cleanflow-services-hostinger.zip`**. هذا الأمر يعمل في بيئة البناء فقط؛ لا يتم تشغيله على Hostinger.

بعد استخراج الأرشيف في `public_html/` يجب أن تكون البنية الأساسية:
```text
public_html/
├── index.html
├── api/index.php
├── api/container-system.php
├── data/sabaik.db
├── uploads/
└── cleanflow-platform/
```
