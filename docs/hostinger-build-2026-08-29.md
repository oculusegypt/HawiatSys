# توثيق حزمة Hostinger — 29 أغسطس 2026

## حالة الإصدار

- **الحالة:** جاهز للرفع بعد إعادة البناء من آخر مصدر واجتياز بوابة SEO والفحوص النهائية.
- **الملف:** `taqi-group-hostinger.zip`
- **النطاق الإنتاجي المعتمد:** `https://taqigroup.com`
- **وقت البناء:** `2026-08-29T20:06:37.663Z`
- **حجم الأرشيف:** `37,986,367` بايت
- **SHA-256 للأرشيف:** `696a222ef1efb83b8ec8af4678b8f17e8c5838fa417ce314b7412d1053d20c64`
- **طريقة التشغيل:** PHP 8.x + PDO SQLite؛ الحزمة لا تعتمد على Node.js أو Replit في الإنتاج.

## قرار المسارات المكررة

الأرشيف يحتفظ بمسارات التوافق القديمة حتى لا تنكسر الروابط السابقة، لكنه لا يعاملها كصفحات عامة مستقلة:

- المسارات الأساسية العربية موجودة في Sitemap وتحمل `index, follow`.
- aliases الحاويات (`container/`, `package/`, `packages/`) وصفحات SEO (`pages/`) تحمل `noindex, follow` مع canonical للمسار الأساسي.
- aliases الإنجليزية للمناطق والنسخ العربية القديمة للصفحات الثابتة تحمل `noindex, follow`.
- Sitemap لا يحتوي أي رابط `noindex`.

بهذا تم إصلاح سبب اختلاف عدد ملفات HTML عن عدد المسارات القابلة للفهرسة دون حذف التوافق مع الروابط القديمة أو تغيير المقاييس يدويًا.

## محتوى الحزمة

- HTML ثابت مولّد مسبقًا للموقع العام.
- `api/index.php` و`api/container-system.php` وملفات `.htaccess`.
- `data/sabaik.db` مع قاعدة SQLite المضمّنة.
- `uploads/` و`images/` وملفات الواجهة والأصول.
- `taqi-group-platform/` لمنصة التشغيل.
- `sitemap.xml` و`robots.txt` و`llms.txt` وملفات favicon/manifest.
- `BUILD_INFO.json` و`UPLOAD_INSTRUCTIONS.txt`.

## نتائج التحقق من الأرشيف النهائي

تم استخراج `taqi-group-hostinger.zip` مؤقتًا وفحص الناتج المستخرج، وليس الاعتماد على مجلد Vite أو المصدر فقط:

- **313** ملف HTML للموقع العام إجماليًا (من دون HTML منصة التشغيل المنفصلة).
- **152** صفحة قابلة للفهرسة و**161** صفحة توافق `noindex`.
- **152** رابطًا فريدًا في Sitemap.
- **152/152** canonical للصفحات المفهرسة، مع تطابق **152/152** مع Sitemap.
- **152/152** صفحة مفهرسة لديها Meta Description.
- **152/152** وصفًا ضمن نطاق الجودة `120–160` حرفًا.
- **152/152** صفحة مفهرسة لديها JSON-LD صالح.
- **152/152** صفحة مفهرسة تحتوي روابط داخلية قابلة للفحص.
- **207** صورة في Sitemap و**170** صورة مستخدمة في HTML، وجميعها موجودة داخل الأرشيف.
- **0** إشارات Branding قديم في الملفات العامة؛ أسماء قاعدة البيانات وشفرة كاشف التوافق التقنية ليست Branding ظاهرًا للمستخدم.
- سلامة قاعدة البيانات: `integrity_check = ok`.
- جميع الصور المشار إليها في Sitemap وHTML موجودة داخل الأرشيف.

## الفحوص المنفذة

- بوابة SEO التفصيلية: **PASS** (152/152).
- فحص استخراج الأرشيف ومطابقة Sitemap: **PASS**.
- `pnpm run typecheck`: **PASS** لجميع الحزم.
- فحص PHP syntax للـ API و`container-system`: **PASS**.
- `git diff --check`: **PASS**.
- `unzip -t taqi-group-hostinger.zip`: **PASS**.
- فحص إقلاع الواجهة وAPI: **PASS**؛ `/api/healthz` يعيد `{"status":"ok"}`.
- تم التحقق من تطابق Node وHostinger PHP في مؤشرات SEO الأساسية ومصدر الأرشيف.

## طريقة الرفع

استخرج محتويات الأرشيف مباشرة داخل `public_html`، وليس داخل مجلد باسم `build_php`.

بعد الاستخراج يجب أن تكون العناصر التالية في الجذر:

```text
public_html/index.html
public_html/api/index.php
public_html/data/sabaik.db
public_html/uploads/
public_html/sitemap.xml
public_html/taqi-group-platform/
```

خذ نسخة احتياطية من `data/` و`uploads/` قبل استبدال نسخة موقع تعمل حاليًا، ثم تحقق من:

```text
https://taqigroup.com/
https://taqigroup.com/sitemap.xml
https://taqigroup.com/taqi-group-platform/
```

## إعادة البناء

```bash
SITE_URL=https://taqigroup.com node scripts/build-hostinger.mjs
SITE_URL=https://taqigroup.com pnpm --filter @workspace/scripts run seo-quality-gate
pnpm run typecheck
unzip -t taqi-group-hostinger.zip
```