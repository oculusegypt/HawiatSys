# ⚠️ التوجيه الإلزامي الأول: معمارية الاستضافة (Hostinger — PHP + SQLite فقط بدون Node.js)
> **تنبيه حاسم لأي مطور أو وكيل ذكاء اصطناعي يعمل على هذا المشروع:**
> 1. خادم الإنتاج على استضافة **Hostinger يعمل كبيئة Shared PHP 8.x + SQLite (PDO) فقط ولا يدعم تشغيل Node.js أو Express أو PM2 في الإنتاج إطلاقاً**.
> 2. كافة الـ API Endpoints، العمليات، المسارات، وتعديلات لوحة التحكم (CRUD) يجب أن تكون منفذة بالكامل داخل `scripts/api-index.php` (الذي يُنقل إلى `build_php/api/index.php`) لتستجيب لجميع طلبات الواجهة الأمامية بدون الحاجة لسيرفر Node.js.
> 3. كافة التحديثات يجب أن تُبنى مسبقاً (Pre-rendered SSG + Static Assets) وتُحزم عبر `node scripts/build-hostinger.mjs` أو `node scripts/package-patch.mjs` لتُرفع مباشرة إلى `public_html`.

---

# دليل نشر مؤسسة تقي جروب على Hostinger

## نظرة عامة

يتم نشر مشروع **مؤسسة تقي جروب - خدمات التنظيف بالرياض** على استضافة Hostinger كحزمة PHP + SQLite متكاملة ومكتفية ذاتياً بنسبة 100% بدون الحاجة لأي سيرفر Node.js خلفي.

- **الواجهة**: React (Vite) مُجمَّعة كـ HTML/JS/CSS مع pre-rendering (أكثر من 190 صفحة SSG جاهزة للأرشفة الفورية)
- **الـ API الخلفي**: ملف PHP كامل ومكتفي ذاتياً (`scripts/api-index.php`) يدير جميع عمليات الـ CRUD لجميع أقسام لوحة التحكم والموقع والذكاء الاصطناعي والإشعارات الفورية
- **قاعدة البيانات**: SQLite — ملف قاعدة البيانات المدمج يُضمَّن في الأرشيف مع كافة بيانات الخدمات والمقالات والباقات وطلبات العملاء

---

## خطوات البناء (Build Execution)

لتوليد الأرشيف النهائي بضغطة واحدة:

```bash
node scripts/build-hostinger.mjs
```

يقوم هذا السكريبت بـ:
1. بناء واجهة React للشركة ولصفحة المنصة التسويقية.
2. توليد 46 صفحة HTML ثابتة (Pre-rendering) للخدمات، المدونة، والأسعار، والأحياء.
3. إجراء WAL checkpoint لقاعدة البيانات المدمجة.
4. تجهيز الأرشيف **`cleanflow-services-hostinger.zip`**.

---

## هيكل الحزمة المُرفوعة (`build_php/`)

```text
build_php/
├── index.html            ← نقطة دخول SPA
├── .htaccess             ← توجيه Apache: /api → PHP، الباقي → index.html
├── assets/               ← ملفات JS / CSS للمشروع
├── blog/                 ← مقالات المدونة المولدة SSG
├── services/             ← صفحات خدمات التنظيف المولدة SSG
├── areas/                ← صفحات أحياء الرياض المولدة SSG
├── pricing/              ← صفحة أسعار خدمات التنظيف
├── api/
│   ├── index.php         ← API كامل لخدمات النظافة والطلبات والمدونة
│   └── .htaccess
└── data/
    └── database.sqlite         ← قاعدة البيانات المدمجة
```

---

## طريقة الرفع على Hostinger

1. افتح **File Manager** بداخل لوحة التحكم في Hostinger.
2. ادخل إلى مجلد `public_html/`.
3. ارفع واضغط فك الضغط لملف **`cleanflow-services-hostinger.zip`**.
4. تأكد من رفع كافة الملفات والـ `.htaccess`.
