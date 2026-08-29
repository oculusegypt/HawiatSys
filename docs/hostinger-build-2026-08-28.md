# توثيق حزمة Hostinger — 29 أغسطس 2026

## حالة الإصدار

- **الحالة:** جاهز للرفع، واجتاز بوابة الجودة النهائية.
- **الملف:** `cleanflow-services-hostinger.zip`
- **آخر بناء:** `2026-08-29 01:34 UTC`
- **الحجم:** `38,405,055` بايت تقريبًا (`37,505 KB`)
- **عدد عناصر الأرشيف:** `836` عنصرًا
- **أرشيف الصور المنفصل:** `cleanflow-legacy-images-archive.zip`
- **أرشيف الصور:** `87` ملفًا فريدًا، منها `33` ملفًا من مجلد `صور حسام`، مع `190` مرجع مصدر، والحجم غير المضغوط `10,527,243` بايت.
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
8. إنشاء `cleanflow-legacy-images-archive.zip` مستقل يجمع الصور القديمة المحددة وكل محتويات `صور حسام`، مع ملف `legacy-images-archive-manifest.json` للبصمات والمصادر.
9. استبعاد الصور القديمة ومجلد `صور حسام` من حزمة الإنتاج، بما في ذلك النسخ المرفوعة ذات الأسماء الرقمية، مع الإبقاء على الصور الحالية المستخدمة.
10. تحويل أي مرجع تشغيلي قديم في قاعدة البيانات وواجهات PHP والواجهة إلى صور Taqi الحالية، حتى لا تنتج الحزمة روابط صور مفقودة.
11. ضبط النص البديل لصور صفحات SEO والخدمات على عنوان المحتوى مباشرة بدل إضافة كلمات مكررة.
12. تصفية صور sitemap وHTML التي لا توجد فعليًا داخل الحزمة، مع دعم أسماء الملفات العربية عند الفحص.
13. تضمين `BUILD_INFO.json` و`UPLOAD_INSTRUCTIONS.txt` داخل الجذر النهائي للأرشيف.
14. إصلاح canonical وOG وJSON-LD ورابط العودة في صفحة CleanFlow Platform لتستخدم النطاق المعتمد.
15. جعل بوابة SEO تفحص كل HTML قابل للفهرسة داخل الأرشيف، بما في ذلك التطبيقات التسويقية المنسوخة إلى الجذر.
16. توحيد اسم الأرشيف الرسمي إلى `cleanflow-services-hostinger.zip` مع نسخة توافقية مطابقة باسم `taqi-group-hostinger.zip`.

## محتوى النسخة المضمنة

- `index.html` وصفحات HTML ثابتة مُولّدة للموقع العام.
- `api/index.php` و`api/container-system.php` وملفات `.htaccess`.
- `data/sabaik.db` بنسخة SQLite مهيأة للاستخدام على Hostinger.
- `uploads/` وجميع أصول الموقع.
- `taqi-group-platform/` لمنصة التشغيل.
- `sitemap.xml` و`robots.txt` و`llms.txt` وبيانات favicon/manifest.
- `images/content/` للمحتوى المنشور فقط؛ الصور القديمة ومجلد `صور حسام` موجودان في الأرشيف المنفصل ولا يُرفعان إلى الإنتاج.

## نتيجة التحقق النهائية

تم استخراج الأرشيف مؤقتًا وتشغيل الفحوصات التالية بنجاح:

- **166** رابطًا فريدًا في sitemap.
- **210** وسم صورة في sitemap، وكلها تشير إلى ملفات موجودة داخل الأرشيف.
- **65** رابط مقال منشور، ولكل مقال صورة في sitemap.
- **50** رابط منطقة عربية.
- **166** مرجع صورة داخل HTML، وكلها موجودة داخل الأرشيف.
- تطابق كامل لـ sitemap بين `public` و`dist` و`build_php` ونسخة ZIP، بالهاش:
  `01d712e54a591fe1aba8e1d16676142335fb9b3bc51404bf9c2b34e33654b1ae`.
- **166** صفحة HTML قابلة للفهرسة، و**166** canonical فريد، و**166** رابط Sitemap متطابق.
- جميع الأوصاف ضمن 120–160 حرفًا، وجميع الصفحات القابلة للفهرسة لديها canonical وJSON-LD وروابط داخلية.
- لا توجد روابط preview أو صفحات `noindex` داخل sitemap.
- لا توجد صور sitemap أو HTML مفقودة.
- لا يوجد مجلد `صور حسام` ولا أي ملف من قائمة الصور القديمة داخل حزمة الإنتاج.
- اختبار `unzip -t` نجح للحزمة الإنتاجية ولأرشيف الصور المنفصل.
- الصفحة الرئيسية تحتوي على title وdescription وcanonical وOpen Graph وH1 و6 كتل JSON-LD.
- عينات الخدمة والمنطقة والمقال: H1 واحد وcanonical واحد لكل صفحة.
- `pnpm --filter @workspace/scripts run typecheck` ناجح.
- `node scripts/check-db.mjs` لم يجد صفوفًا متضررة.
- `php -l build_php/api/index.php` ناجح.
- `php -l build_php/api/container-system.php` ناجح.
- `pnpm run typecheck` ناجح لجميع الحزم.
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
public_html/taqi-group-platform/
```

خذ نسخة احتياطية من `data/` و`uploads/` قبل استبدال نسخة موقع يعمل حاليًا. بعد الرفع افتح:

```text
https://taqigroup.com/
https://taqigroup.com/sitemap.xml
https://taqigroup.com/taqi-group-platform/
```

## إعادة البناء وإعادة الشهادة

```bash
SITE_URL=https://taqigroup.com node scripts/build-hostinger.mjs
SITE_URL=https://taqigroup.com pnpm --filter @workspace/scripts run seo-quality-gate
pnpm --filter @workspace/scripts run typecheck
unzip -t cleanflow-services-hostinger.zip
unzip -t cleanflow-legacy-images-archive.zip
```

النسخة التفصيلية المقروءة آليًا محفوظة داخل الأرشيف في `BUILD_INFO.json`، وتعليمات الرفع موجودة في `UPLOAD_INSTRUCTIONS.txt`. أرشيف الصور مستقل تمامًا ولا يُرفع إلى `public_html`.