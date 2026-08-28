# توثيق حزمة Hostinger — 28 أغسطس 2026

## الملف الناتج

- `cleanflow-services-hostinger.zip`
- يجب استخراج محتوياته مباشرة داخل `public_html`، وليس داخل مجلد فرعي باسم `build_php`.
- النسخة المضمنة تعمل عبر PHP 8.x وPDO SQLite، ولا تعتمد على Node.js أو خادم Replit في الإنتاج.

## ما تم تضمينه

1. مسار `DELETE /api/admin/employees/{id}` في `api/index.php` مع قواعد الصلاحيات نفسها الموجودة في نسخة Node:
   - منع الموظف من حذف حسابه الحالي.
   - منع المدير من حذف مدير النظام.
   - منع حذف آخر مدير نظام.
2. توحيد روابط المناطق في sitemap إلى slugs عربية، مع إبقاء aliases الإنجليزية داخل التطبيق للتوافق مع الروابط القديمة.
3. تحديث `homepage_content` في قاعدة SQLite الحالية، وتحديث seed حتى لا تعود slugs الإنجليزية عند إعادة التهيئة.
4. إضافة صورة cover أو `og_image` أو صورة SEO بديلة لكل مقال منشور في sitemap.
5. استبدال صور المقالات القديمة وصور `homepage_content` بصور الهيرو الحالية `Taqi-hero1.webp` إلى `Taqi-hero5.webp` باختيار ثابت متنوع لكل سجل.
6. نقل 50 صورة قديمة أو غير مستخدمة إلى `images/صور حسام/` داخل الأرشيف، مع إزالة مجلد `images/content/` من مسارات التشغيل.
7. تصفية صور sitemap وHTML التي لا توجد فعليًا داخل الحزمة، مع دعم أسماء الملفات العربية المشفرة في فحص الجودة.
8. تضمين `BUILD_INFO.json` و`UPLOAD_INSTRUCTIONS.txt` داخل الأرشيف.

## نتيجة التحقق

تم تشغيل بوابة SEO على `https://taqigroup.com` بعد استخراج الأرشيف مؤقتًا، ونجحت جميع الفحوصات:

- 167 رابط sitemap فريدًا.
- 209 وسم صورة، وكلها تشير إلى ملفات موجودة داخل الأرشيف.
- 65 رابط مقال، وكل مقال له صورة في sitemap.
- 65 مقالاً منشوراً يستخدم صور `Taqi-hero*.webp`، ولا توجد إشارات منشورة إلى `/images/content/` أو صور المقالات القديمة.
- 50 صورة منقولة إلى `build_php/images/صور حسام/` للحفظ دون استخدامها في الواجهة.
- روابط المناطق مولّدة بالمعرّفات العربية.
- سلامة `api/index.php` وملفات PHP.
- تطابق sitemap بين `public` و`dist` و`build_php` والأرشيف المضغوط.
- فحص TypeScript لواجهة API وملفات scripts ناجح.
- `unzip -t cleanflow-services-hostinger.zip` ناجح.

## أمر إعادة البناء والتحقق

```bash
SITE_URL=https://taqigroup.com node scripts/build-hostinger.mjs
SITE_URL=https://taqigroup.com pnpm --filter @workspace/scripts run seo-quality-gate
```

بعد الرفع، يجب التأكد من أن:

```text
public_html/index.html
public_html/api/index.php
public_html/data/sabaik.db
public_html/uploads/
public_html/sitemap.xml
```

موجودة في الجذر، ثم فتح `https://taqigroup.com/sitemap.xml` واختبار حذف موظف غير حالي من لوحة الإدارة.