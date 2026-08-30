# إصلاح Structured Content في حزمة Hostinger — 31 أغسطس 2026

## المشكلة

كان الموقع العام يستدعي:

```text
/api/structured-content?path=/
```

لكن نسخة Hostinger القديمة لم تكن تحتوي على مسار PHP المقابل، فكان الطلب يرجع
`404` ويظهر في المتصفح خطأ `Target website not loaded`.

## ما تم إصلاحه

تمت إضافة المسارات إلى `scripts/api-index.php`، وهو الملف الذي ينسخه البناء إلى
`api/index.php`:

- `GET /api/structured-content?path=/`
- `GET /api/admin/structured-content`
- `GET /api/admin/structured-content/debug?path=/`
- `POST /api/admin/structured-content`
- `PATCH /api/admin/structured-content/:id`
- `DELETE /api/admin/structured-content/:id`

المسار العام يعيد قائمة FAQ النشطة بصيغة JSON، بينما مسارات الإدارة محمية
بصلاحية `structured_content` ولا تعتمد على إخفاء رابط لوحة التحكم فقط.

## التحقق

- نسخة PHP المولّدة: `GET /api/structured-content?path=/` يعيد `200` وJSON.
- `/api/healthz` يعيد حالة قاعدة البيانات `ok`.
- مسارات الإدارة بدون جلسة تعيد `401 Unauthorized` بدل `404`.
- فحص صياغة PHP ناجح.
- فحص TypeScript للواجهة ناجح.
- بوابة SEO للأرشيف النهائي ناجحة.
- اختبار ZIP ناجح.

## طريقة الرفع

استخدم الملف:

```text
cleanflow-services-hostinger.zip
```

أو النسخة التوافقية المطابقة:

```text
taqi-group-hostinger.zip
```

استخرج محتوى الأرشيف مباشرة داخل `public_html`، وليس داخل مجلد `build_php`.
بعد الرفع يجب أن يكون المسار موجودًا هكذا:

```text
public_html/api/index.php
public_html/api/.htaccess
public_html/.htaccess
public_html/data/sabaik.db
public_html/uploads/
```

بعد اكتمال الرفع اختبر:

```text
https://taqigroup.com/api/structured-content?path=/
https://taqigroup.com/api/healthz
```

إذا استمر ظهور النسخة القديمة، امسح Cache المتصفح وCloudflare/Hostinger
وتأكد من أن `api/index.php` الذي رُفع هو الملف الموجود داخل الأرشيف الجديد.

## معلومات الأرشيف

- الحجم: `39,531,139` بايت
- SHA-256:
  `ceb208d94c282131705e9a21d1854c405154e0e71319a8adaa70123f8aa88d10`
- التشغيل في الإنتاج: PHP 8.x + PDO SQLite فقط، دون Node.js.