# توثيق حزمة Hostinger — 28 أغسطس 2026

## حالة الإصدار

- **الحالة:** جاهز للرفع، واجتاز بوابة الجودة النهائية.
- **الملف:** `cleanflow-services-hostinger.zip`
- **آخر بناء:** `2026-08-28 18:51 UTC`
- **الحجم:** `45,510,836` بايت تقريبًا (`44,444 KB`)
- **عدد عناصر الأرشيف:** `747`
- **الموقع المعتمد للفحص:** `https://taqigroup.com`
- **طريقة التشغيل:** PHP 8.x + PDO SQLite فقط؛ لا يعتمد الإنتاج على Node.js أو Replit.

## التعديلات الأخيرة

1. تحديث مسار `DELETE /api/admin/employees/{id}` في `api/index.php` مع قواعد الصلاحيات المطابقة لنسخة Node:
   - منع الموظف من حذف حسابه الحالي.
   - منع المدير من حذف مدير النظام.
   - منع حذف آخر مدير نظام.
2. توحيد روابط المناطق في sitemap إلى slugs عربية، مع إبقاء aliases الإنجليزية داخل التطبيق للتوافق مع الروابط القديمة.
3. تحديث `homepage_content` وملفات seed حتى لا تعود slugs الإنجليزية عند إعادة التهيئة.
4. إضافة صورة cover أو `og_image` أو صورة SEO بديلة لكل مقال وصفحة SEO منشورة.
5. تحويل صور المقالات القديمة ووسائط الصفحة الرئيسية إلى مجموعة `Taqi-hero1.webp` حتى `Taqi-hero5.webp` باختيار ثابت ومتوازن لكل سجل.
6. تطوير ترحيل الصور في `migrate-content-image-names.mjs` ليغطي المقالات وصفحات SEO والخدمات (`image_url` و`images`) مع وضع معاينة آمن افتراضيًا وخيار `--apply`، وعدم حذف الصور الأصلية.
7. إصلاح تنظيف الصور في `clean-legacy-article-images.mjs` ليحافظ على مراجع الخدمات والشرائح، ويعيد تلقائيًا الملفات المُشار إليها التي سبق نقلها إلى مجلد الحفظ.
8. إبقاء 50 صورة قديمة أو غير مستخدمة في `images/صور حسام/` للحفظ فقط، مع إبقاء 99 صورة محتوى مستخدمة في مسارات `images/content/`.
9. ضبط النص البديل لصور صفحات SEO والخدمات على عنوان المحتوى مباشرة بدل إضافة كلمات مكررة.
10. تصفية صور sitemap وHTML التي لا توجد فعليًا داخل الحزمة، مع دعم أسماء الملفات العربية عند الفحص.
11. تضمين `BUILD_INFO.json` و`UPLOAD_INSTRUCTIONS.txt` داخل الجذر النهائي للأرشيف.

## محتوى النسخة المضمنة

- `index.html` وصفحات HTML ثابتة مُولّدة للموقع العام.
- `api/index.php` و`api/container-system.php` وملفات `.htaccess`.
- `data/sabaik.db` بنسخة SQLite مهيأة للاستخدام على Hostinger.
- `uploads/` وجميع أصول الموقع.
- `cleanflow-platform/` لمنصة التشغيل.
- `sitemap.xml` و`robots.txt` و`llms.txt` وبيانات favicon/manifest.
- `images/content/` للمحتوى المنشور و`images/صور حسام/` للحفظ غير التشغيلي.

## نتيجة التحقق النهائية

تم استخراج الأرشيف مؤقتًا وتشغيل الفحوصات التالية بنجاح:

- **167** رابطًا فريدًا في sitemap.
- **209** وسم صورة في sitemap، وكلها تشير إلى ملفات موجودة داخل الأرشيف.
- **65** رابط مقال منشور، ولكل مقال صورة في sitemap.
- **50** رابط منطقة عربية.
- **158** مرجع صورة داخل HTML، وكلها موجودة داخل الأرشيف.
- تطابق كامل لـ sitemap بين `public` و`dist` و`build_php` ونسخة ZIP، بالهاش:
  `04b0a311975b5d02e2e6d324e26be2df839fcd03114a7a887f35f9f888a8ed84`.
- لا توجد روابط preview أو صفحات `noindex` داخل sitemap.
- لا توجد صور sitemap أو HTML مفقودة.
- الصفحة الرئيسية تحتوي على title وdescription وcanonical وOpen Graph وH1 و4 كتل JSON-LD.
- عينات الخدمة والمنطقة والمقال: H1 واحد وcanonical واحد لكل صفحة.
- `pnpm --filter @workspace/scripts run typecheck` ناجح.
- `node scripts/check-db.mjs` لم يجد صفوفًا متضررة.
- `php -l build_php/api/index.php` ناجح.
- `php -l build_php/api/container-system.php` ناجح.
- `unzip -t cleanflow-services-hostinger.zip` ناجح دون أخطاء.
- الواجهة وواجهة API تعملان بعد إعادة التشغيل، وسجلات المتصفح لا تحتوي على أخطاء تشغيلية جديدة.

## طريقة الرفع إلى Hostinger

استخرج محتويات الأرشيف مباشرة داخل `public_html`، وليس داخل مجلد باسم `build_php`.

بعد الاستخراج يجب أن تكون العناصر التالية في الجذر:

```text
public_html/index.html
public_html/api/index.php
public_html/data/sabaik.db
public_html/uploads/
public_html/sitemap.xml
public_html/cleanflow-platform/
```

خذ نسخة احتياطية من `data/` و`uploads/` قبل استبدال نسخة موقع يعمل حاليًا. بعد الرفع افتح:

```text
https://taqigroup.com/
https://taqigroup.com/sitemap.xml
https://taqigroup.com/cleanflow-platform/
```

## إعادة البناء وإعادة الشهادة

```bash
SITE_URL=https://taqigroup.com node scripts/build-hostinger.mjs
SITE_URL=https://taqigroup.com pnpm --filter @workspace/scripts run seo-quality-gate
pnpm --filter @workspace/scripts run typecheck
unzip -t cleanflow-services-hostinger.zip
```

النسخة التفصيلية المقروءة آليًا محفوظة داخل الأرشيف في `BUILD_INFO.json`، وتعليمات الرفع موجودة في `UPLOAD_INSTRUCTIONS.txt`.