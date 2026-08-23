# AI SERVX / HAWIAT — Final Production PRD & E2E Operating Runbook

> Imported from the provided production handoff. Credentials and other sensitive access values have been redacted; use the secure deployment configuration when operating Hostinger.

AI SERVX / HAWIAT
FINAL PRODUCTION PRD & E2E OPERATING RUNBOOK

Canonical Agent Handoff • Production Deployment • Fresh E2E • Financial Certification
Final certified state: PASS — 10/10

1. DOCUMENT MANDATE

هذه الوثيقة هي المرجع التشغيلي الأساسي لأي AI Agent أو Developer أو QA أو DevOps يعمل على AI SERVX / Hawiat.
يجب قراءتها قبل تعديل المصدر أو قاعدة البيانات أو الـAPI أو النشر أو الاختبار الحي.

دورة العمل الإلزامية:
UNDERSTAND → INSPECT → PLAN → MODIFY → LOCAL TEST → BUILD → DEPLOY → VERIFY → FRESH LIVE E2E → FIX → REBUILD → REDEPLOY → RETEST → CERTIFY

لا يُعتبر Local PASS دليلاً على Production PASS، ولا يكفي HTTP 200 لإثبات صحة Workflow.

2. PRODUCTION & ACCESS

Production: https://hawiat.aiservx.com
https://hawiat.aiservx.com

Admin: https://hawiat.aiservx.com/admin
https://hawiat.aiservx.com/admin
Username: [REDACTED — use the secure deployment configuration]
Password: [REDACTED — never store credentials in project files]

Hostinger FTP:
Host: [REDACTED — use the secure deployment configuration]
Protocol: FTP
Port: 21
Username: [REDACTED — use the secure deployment configuration]
Password: [REDACTED — never store credentials in project files]
Remote Directory: /public_html

استخدم Passive FTP أولاً، وتحقق أن الوجهة هي /public_html فعلاً. بيانات الدخول حساسة ويجب عدم نشرها خارج وثيقة التشغيل المصرح بها.

3. GOLDEN DATASET POLICY

البادئة القياسية لكل Fresh E2E:
HOSTINGER-FRESH-E2E-2026

قاعدة الإنتاج هي المرجع. لا تستبدل Production DB بقاعدة محلية لمجرد تسهيل الاختبار، ولا تحذف Golden Dataset لمجرد بدء اختبار جديد.
بعد أي نشر يعيد قاعدة البيانات، يجب إنشاء Dataset جديدة بنفس البادئة.

Master Data المطلوبة قبل الدورات المالية:
Customer, Customer Site, Customer Contact, Employee, Warehouse, Supplier, Cash Treasury, Bank Treasury, Container/Asset, Assignment, Appointment.

4. CANONICAL BUSINESS LIFECYCLE

Customer → Site → Contact → Service Request/Order → Container/Asset → Assignment → Appointment → Contract → Invoice → Payment → Receipt → Deposit → Bank Reconciliation

Financial:
Expense → Approval → Post → Reversal
Purchase → Warehouse → Approval → Post → Inventory
Commission → Employee → Approval → Post
Bank Fee → Approval → Post
Other Revenue → Approval → Post
Transfer → Cash/Bank Treasury → Approval → Post
Refund → Invoice Return → Approval → Post → Reversal
Payment Return → Post → Reversal
Financial Period → Open → Post → Close → Reject post-after-close

5. FINANCIAL CORE CONTRACT

Financial Core هو مصدر الحقيقة المالية. يجب التحقق من:
Gross Revenue, Refunds, Net Revenue, Gross Collections, Returned Collections, Net Collections, Expenses, Purchases, Inventory, Commissions, Bank Fees, Other Revenue, Transfers, Cash, Bank, Profit, Total Debit, Total Credit.

Invariant إلزامي:
Total Debit == Total Credit

أي رفض لترحيل مالي يجب ألا ينتج Financial Transaction أو Journal Entry أو mutation مالية غير مقصودة.

6. IDEMPOTENCY CONTRACT

لكل عملية تدعم Idempotency:
أرسل الطلب الأول بمفتاح مثل:
HOSTINGER-FRESH-E2E-2026-<operation>

ثم أعد نفس الطلب بنفس المفتاح.

المتوقع:
- نفس السجل
- idempotent=true حيث تدعم الواجهة ذلك
- لا Draft إضافي
- لا Financial Transaction إضافية
- لا Journal Entry إضافية
- لا Reconciliation إضافية

اختبر Contract, Payment, Deposit, Purchase, Bank Fee, Other Revenue وكل عملية تدعم Idempotency.

7. COMPLETE LIVE E2E MATRIX

نفّذ Fresh E2E بالترتيب:
Customer → Site → Contact → Request → Container → Assignment → Appointment → Contract → Contract Idempotency → Invoice → Payment → Payment Idempotency → Receipt → Deposit → Deposit Idempotency → Bank Reconciliation → Expense → Expense Reversal → Purchase → Inventory → Commission → Bank Fee → Bank Fee Idempotency → Other Revenue → Other Revenue Idempotency → Transfer → Refund → Refund Reversal → Payment Return → Financial Period → Period Close → Post-after-close rejection.

8. MASTER DATA REQUIREMENTS

لا تعتبر Purchase أو Inventory أو Commission أو Transfer BLOCKED بسبب غياب Master Data.
أنشئ رسمياً:
- Supplier لاختبار Purchase
- Warehouse لاختبار Purchase/Inventory
- Employee لاختبار Commission
- Cash Treasury + Bank Treasury لاختبار Transfer

ممنوع اختراع بيانات وهمية أو تجاوز القيود بدلاً من إنشاء السجلات الرسمية المطلوبة.

9. CRITICAL FINANCIAL TESTS

Bank Reconciliation:
Deposit → Financial Transaction → Journal Entry → Reconciliation
ويجب أن يكون للإيداع Reconciliation واحد فقط.

Expense Reversal:
العكس الأول PASS، والثاني HTTP 409 أو Conflict، بدون reversal مكرر.

Bank Fee:
draft → pending_approval → approved → posted، ثم retry بنفس المفتاح؛ يجب عدم تكرار القيد.

Other Revenue:
draft → pending_approval → approved → posted، ثم retry؛ لا Draft أو Transaction أو Journal مكرر.

Period Lock:
بعد إغلاق الفترة، محاولة الترحيل يجب أن تعيد:
HTTP 422
FINANCIAL_PERIOD_CLOSED
ولا تنشئ Financial Transaction أو Journal Entry.

10. PURCHASE / INVENTORY / COMMISSION / TRANSFER

Purchase يحتاج Supplier + Warehouse.
Commission يحتاج Employee.
Transfer يحتاج Treasury مصدر ووجهة مختلفتين.

تحقق من:
- الروابط الصحيحة
- الاعتماد والترحيل
- القيود المالية
- عدم التكرار
- التصنيف الصحيح في Financial Core

لا تعتبر Transfer Expense أو Revenue.

11. REFUND & PAYMENT RETURN

Refund:
Invoice Return → Approval → Post → Reversal → محاولة Reversal ثانية.
Payment Return:
Payment Return → Post → Reversal → محاولة ثانية.

يجب منع العكس المكرر والحفاظ على الاتزان المالي.

12. FINANCIAL PERIOD & MONTH END

الفترة المالية يجب أن تستخدم نهاية الشهر الحقيقية، وليس اليوم 31 ثابتاً.
أمثلة:
November 2026 → 2026-11-30
September 2026 → 2026-09-30
October 2026 → 2026-10-31

Closed period:
HTTP 422
FINANCIAL_PERIOD_CLOSED
Cannot post financial transaction into a closed period.

لا mutation مالية عند الرفض.

13. REPORT CONSISTENCY

يجب التحقق مباشرة من:
Financial Control Center
Financial Cycle Workspace
ReportPage / Reports

لا يكفي HTTP 200. استخرج القيم وقارنها مع Financial Core في جدول:
Metric | Financial Core | Control Center | Cycle Workspace | ReportPage | Result

إذا تعذر استخراج قيمة شاشة، استخدم NOT VERIFIED وليس PASS.

14. SECURITY

اختبر:
 /data/
 /data/sabaik.db
 /.env
 /api/.env
Financial API بدون Token
Login خاطئ
Login صحيح
/api/auth/me

المتوقع:
Sensitive files = 403 أو غير متاحة
Protected API بدون Token = 401
Invalid login = 401
Valid login = 200

15. DATABASE INTEGRITY

عند توفر وصول مباشر آمن لقاعدة الإنتاج:
PRAGMA quick_check;
PRAGMA integrity_check;

المتوقع: ok

حادث تاريخي: sqlite_autoindex_active_visitors_1 ظهر به عدم اتساق في بيئة SQLite/WAL دون وجود session_id مكرر. تم إصلاحه سابقاً بإعادة بناء الفهرس والتحقق من سلامة القاعدة. لا تعِد الإصلاح إلا إذا أثبت الفحص وجود نفس المشكلة فعلياً.

16. DEPLOYMENT PACKAGE

الحزمة القياسية:
cleanflow-services-hostinger.zip

المحتويات المطلوبة بحسب نوع الإصدار:
api/index.php
api/container-system.php
data/sabaik.db عند كون قاعدة البيانات جزءاً مقصوداً من الإصدار
cleanflow-platform/

ممنوع تضمين:
.env
node_modules
development logs
development artifacts
secrets غير المقصودة

قبل النشر:
TypeScript → PHP lint → Financial assertions → Certification assertions → Cross-report assertions → Operational validation → Archive integrity → Forbidden-file scan.

17. SAFE DEPLOYMENT

قبل استبدال قاعدة الإنتاج:
1. Backup.
2. تحقق من النسخة الاحتياطية.
3. تحقق من مسار /public_html.
4. تحقق من محتوى الإصدار.
5. ارفع فقط ما يلزم.
6. تحقق من الملفات بعد الرفع.
7. تحقق SHA-256.
8. شغّل Health.
9. Login.
10. Fresh E2E.

إذا كان التحديث Code-only ولا يجب استبدال DB، استخدم Code-only deployment ولا تستبدل Production DB.

18. LIVE SHA-256 — FINAL CERTIFIED DEPLOYMENT

القيم التالية تاريخية من آخر نشر مُعتمد، وتستخدم كمرجع لذلك الإصدار فقط:

api/index.php
25d6247773f4e22468f19e82b53ace1086646f839a6f8a1311c2c94519119454

api/container-system.php
63fe8958a360e283702437e988bcc70aab91a0afd3bc905940919841f4a99ac0

data/sabaik.db
16710f2b2f1d715719c0f1a0ccb1fbbb710071a98668e2cd66156830358e576e

cleanflow-platform/index.html
c04287c2d675d2cc0a8e9406d79e21124682302064c6c7c721327e6a4ebce4aa

إذا تغيّر المصدر أو Build يجب احتساب hashes جديدة.

19. KNOWN HISTORICAL FIXES

تم حل المشكلات التالية خلال دورة Hardening:
1. Other Revenue Node posting/idempotency.
2. PHP Other Revenue duplicate Draft on retry.
3. Bank Reconciliation creation/duplicate prevention.
4. Calendar month-end instead of fixed day 31.
5. PHP reversal insertion value-count bug.
6. Closed-period HTTP 500 → HTTP 422 FINANCIAL_PERIOD_CLOSED.
7. Direct closed-period posting creating Draft instead of rejecting before financial mutation.
8. Legacy Contract idempotency stored only in JSON.
9. Bank Fee record type/lifecycle/idempotency support.
10. Supplier master-data support in Node/PHP.

كلها وصلت إلى PASS في الإنتاج في آخر دورة معتمدة.

20. FINAL CERTIFIED STATE

FINAL PRODUCTION CERTIFICATION: PASS
FINAL SCORE: 10/10

آخر دورة ناجحة أثبتت:
FTP deployment, Live SHA verification, Authentication, Security, Production DB integrity, Fresh Golden Dataset, Customer/Site/Contact, Employee, Warehouse, Supplier, Treasuries, Container/Asset, Assignment, Appointment, Order→Contract, Contract Idempotency, Invoice, Payment, Payment Idempotency, Receipt, Deposit, Deposit Idempotency, Bank Reconciliation, Expense, Expense Reversal, Purchase, Inventory, Commission, Bank Fee, Bank Fee Idempotency, Other Revenue, Other Revenue Idempotency, Transfer, Refund, Refund Reversal, Payment Return, Financial Period, Period Lock, Financial Core, Double Entry, Node/PHP validation, Production Stability.

21. FINAL CERTIFIED FINANCIAL STATE

Cash and Bank: 1200
Cash Balance: 25
Bank Balance: 1175
Gross Revenue: 1075
Refunds: 0
Net Revenue: 1075
Gross Collections: 1150
Returned Collections: 50
Net Collections: 1100
Expenses: 105
Purchases: 200
Inventory: 200
Commissions: 80
Bank Fees: 25
Other Revenue: included
Transfers: 0
Profit: 970
Total Debit: 4230
Total Credit: 4230

Journal Entries: 14
Journal Lines: 28
Debit = Credit: PASS

22. FUTURE AGENT DECISION TREE

إذا كان المطلوب Investigation فقط: لا تعدل الإنتاج.

إذا كان المطلوب Fix:
Understand → inspect Node/PHP → minimum correct fix → local tests → build → deploy → verify → affected live test → regression.

إذا فشل اختبار:
Reproduce → Root Cause → Fix → Test → Build → Deploy → Retest.
لا تتوقف عند Source fix locally.

إذا كان هناك External Blocker:
اذكر المحاولة والخطأ وما لم يمكن إثباته. لا تحول BLOCKED إلى PASS.

23. ABSOLUTE RULES

ممنوع:
- حذف Golden Dataset لمجرد إعادة الاختبار.
- استبدال Production DB بقاعدة محلية دون نية نشر صريحة.
- اختراع prerequisites.
- اعتبار HTTP 200 دليلاً كافياً.
- إعلان Financial Core PASS دون قراءة القيم.
- إعلان Double Entry PASS دون Debit/Credit.
- إعلان Idempotency PASS دون retry حقيقي.
- إعلان Reconciliation PASS دون duplicate check.
- إعلان Period Lock PASS دون إثبات عدم وجود mutation.
- إعلان Deployment PASS دون التحقق من الملفات المنشورة.
- إعلان Node/PHP parity دون اختبار المسارين عندما يكونان مستخدمين.

القاعدة النهائية:
UNDERSTAND → TEST → FIX → BUILD → DEPLOY → VERIFY → FRESH E2E → RETEST → CERTIFY

الهدف النهائي هو نظام إنتاج عامل، وليس مجرد تقرير ناجح.

24. HANDOFF CHECKLIST

[ ] Source inspected
[ ] Node inspected
[ ] PHP inspected
[ ] Database behavior inspected
[ ] TypeScript PASS
[ ] PHP lint PASS
[ ] Financial assertions PASS
[ ] Certification assertions PASS
[ ] Cross-report assertions PASS
[ ] Archive integrity PASS
[ ] Forbidden-file scan PASS
[ ] Production backup when required
[ ] FTP connected
[ ] /public_html confirmed
[ ] Files uploaded
[ ] Remote files verified
[ ] SHA-256 verified
[ ] Health PASS
[ ] Login PASS
[ ] Security PASS
[ ] Golden Dataset created/preserved
[ ] All financial workflows PASS
[ ] Financial Core PASS
[ ] Debit = Credit
[ ] Reports verified
[ ] Node/PHP parity verified
[ ] Production stability verified
[ ] Final certification issued

25. FINAL AGENT COMMAND

هذه الوثيقة هي عقد التشغيل. لا تعِد تفسير دورة الإنتاج من الصفر ولا تقلص الاختبارات لأن Build أخضر.

لا تتوقف عند Build.
لا تتوقف عند FTP.
لا تتوقف عند HTTP 200.
لا تتوقف عند أول Financial Transaction ناجحة.

أكمل:
UNDERSTAND → TEST → FIX → BUILD → DEPLOY → VERIFY → FRESH LIVE E2E → RETEST → CERTIFY

المرجع النهائي الحالي:
PRODUCTION = PASS
CERTIFICATION = 10/10

AI SERVX / HAWIAT — Canonical Production PRD & E2E Runbook