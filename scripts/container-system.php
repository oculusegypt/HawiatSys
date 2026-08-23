<?php
declare(strict_types=1);

/**
 * Hostinger container-system API.
 *
 * This file is included by api-index.php and intentionally uses only PHP 8.x,
 * PDO and SQLite. It mirrors the development API's generic record contract so
 * the existing admin UI works on shared hosting without Node.js.
 */

function hsJson(mixed $value, int $status = 200): never {
    http_response_code($status);
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function hsPayload(string|null $value): array {
    if (!$value) return [];
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

function hsRecord(array $row): array {
    $row['id'] = (int)$row['id'];
    $row['createdBy'] = isset($row['created_by']) ? (int)$row['created_by'] : null;
    $row['createdAt'] = $row['created_at'] ?? null;
    $row['updatedAt'] = $row['updated_at'] ?? null;
    $row['payload'] = hsPayload($row['payload'] ?? null);
    unset($row['created_by'], $row['created_at'], $row['updated_at']);
    return $row;
}

function hsPostedCollections(array $rows): array {
    $posted = array_values(array_filter($rows, static fn(array $row): bool =>
        $row['status'] === 'posted' && in_array($row['kind'], ['payment', 'receipt'], true)
    ));
    $payments = array_values(array_filter($posted, static fn(array $row): bool => $row['kind'] === 'payment'));
    $keys = [];
    foreach ($payments as $payment) {
        $payload = $payment['payload'];
        $keys[] = implode('|', [
            (string)($payload['customerRecordId'] ?? ''),
            (string)($payload['contractRecordId'] ?? $payload['contractNumber'] ?? ''),
            (string)($payload['invoiceRecordId'] ?? $payload['invoiceNumber'] ?? ''),
            (string)($payload['amount'] ?? ''),
            (string)($payload['date'] ?? ''),
        ]);
    }
    foreach ($posted as $row) {
        if ($row['kind'] !== 'receipt') continue;
        $payload = $row['payload'];
        $key = implode('|', [
            (string)($payload['customerRecordId'] ?? ''),
            (string)($payload['contractRecordId'] ?? $payload['contractNumber'] ?? ''),
            (string)($payload['invoiceRecordId'] ?? $payload['invoiceNumber'] ?? ''),
            (string)($payload['amount'] ?? ''),
            (string)($payload['date'] ?? ''),
        ]);
        if (!isset($payload['sourcePaymentId']) && !in_array($key, $keys, true)) $payments[] = $row;
    }
    return $payments;
}

function hsEnsureSchema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS container_system_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        reference TEXT NOT NULL DEFAULT '',
        payload TEXT NOT NULL DEFAULT '{}',
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS container_system_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id INTEGER,
        kind TEXT NOT NULL,
        action TEXT NOT NULL,
        before_payload TEXT,
        after_payload TEXT,
        actor_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");
    try { $pdo->exec("ALTER TABLE container_system_records ADD COLUMN operation_key TEXT"); } catch (Throwable) { /* already exists */ }
    try {
        $pdo->exec("UPDATE container_system_records SET operation_key = json_extract(payload, '$.operationKey') WHERE operation_key IS NULL AND json_extract(payload, '$.operationKey') IS NOT NULL");
    } catch (Throwable) { /* legacy SQLite without JSON1 */ }
    $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_container_system_records_operation_key ON container_system_records(kind, operation_key) WHERE operation_key IS NOT NULL AND operation_key <> '' AND status <> 'archived'");
    $columns = $pdo->query("PRAGMA table_info(service_requests)")->fetchAll(PDO::FETCH_ASSOC);
    $known = array_fill_keys(array_map(static fn(array $column): string => (string)$column['name'], $columns), true);
    $migrations = [
        'customer_record_id' => 'INTEGER',
        'container_record_id' => 'INTEGER',
        'contract_record_id' => 'INTEGER',
        'driver_location_lat' => 'TEXT',
        'driver_location_lng' => 'TEXT',
        'driver_proof_photo_url' => 'TEXT',
        'driver_signature_data' => 'TEXT',
        'driver_receiver_name' => 'TEXT',
        'driver_response_at' => 'TEXT',
        'driver_started_at' => 'TEXT',
        'driver_completed_at' => 'TEXT',
        'driver_notes' => 'TEXT',
        'driver_status' => "TEXT NOT NULL DEFAULT 'unassigned'",
        'assigned_driver_id' => 'INTEGER',
        'assigned_at' => 'TEXT',
    ];
    foreach ($migrations as $column => $type) {
        if (!isset($known[$column])) {
            $pdo->exec("ALTER TABLE service_requests ADD COLUMN {$column} {$type}");
        }
    }
}

function hsSyncRequestsToCustomers(PDO $pdo): void {
    $requests = $pdo->query("SELECT id, client_name, phone, email, service_type, location, created_at, customer_record_id FROM service_requests ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
    $findCustomer = $pdo->prepare("SELECT id, payload FROM container_system_records WHERE kind = 'customer' AND status != 'archived'");
    $updateCustomer = $pdo->prepare("UPDATE container_system_records SET payload = :payload, updated_at = :updated_at WHERE id = :id");
    $insertCustomer = $pdo->prepare("INSERT INTO container_system_records (kind, status, reference, payload, created_at, updated_at) VALUES ('customer', 'active', :reference, :payload, :now, :now)");
    $findSite = $pdo->prepare("SELECT id, payload FROM container_system_records WHERE kind = 'customer_site' AND status != 'archived'");
    $insertSite = $pdo->prepare("INSERT INTO container_system_records (kind, status, reference, payload, created_at, updated_at) VALUES ('customer_site', 'active', :reference, :payload, :now, :now)");
    $linkRequest = $pdo->prepare("UPDATE service_requests SET customer_record_id = :customer_id WHERE id = :id");

    foreach ($requests as $request) {
        $phoneDigits = preg_replace('/\D+/', '', (string)($request['phone'] ?? ''));
        if ($phoneDigits === '') continue;
        $customer = null;
        $findCustomer->execute();
        foreach ($findCustomer->fetchAll(PDO::FETCH_ASSOC) as $candidate) {
            $payload = hsPayload((string)($candidate['payload'] ?? ''));
            if ($phoneDigits === preg_replace('/\D+/', '', (string)($payload['phone'] ?? ''))) {
                $customer = ['id' => (int)$candidate['id'], 'payload' => $payload];
                break;
            }
        }

        $now = date('c');
        if (!$customer) {
            $payload = [
                'name' => trim((string)($request['client_name'] ?? '')) ?: 'عميل الطلب',
                'phone' => (string)$request['phone'],
                'email' => (string)($request['email'] ?? ''),
                'source' => 'service_request',
                'firstRequestId' => (int)$request['id'],
                'lastRequestId' => (int)$request['id'],
                'lastRequestClientName' => (string)($request['client_name'] ?? ''),
                'lastRequestAt' => (string)($request['created_at'] ?? $now),
            ];
            $insertCustomer->execute([
                ':reference' => 'CUS-' . str_pad((string)$request['id'], 5, '0', STR_PAD_LEFT),
                ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
                ':now' => $now,
            ]);
            $customer = ['id' => (int)$pdo->lastInsertId(), 'payload' => $payload];
        } else {
            $payload = $customer['payload'];
            $payload['lastRequestId'] = (int)$request['id'];
            $payload['lastRequestClientName'] = (string)($request['client_name'] ?? '');
            $payload['lastRequestAt'] = (string)($request['created_at'] ?? $now);
            if (!empty($request['email'])) $payload['email'] = (string)$request['email'];
            $updateCustomer->execute([
                ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
                ':updated_at' => $now,
                ':id' => $customer['id'],
            ]);
        }

        $location = trim((string)($request['location'] ?? ''));
        if ($location !== '' && $location !== 'غير محدد') {
            $sameSite = false;
            $findSite->execute();
            foreach ($findSite->fetchAll(PDO::FETCH_ASSOC) as $siteRow) {
                $sitePayload = hsPayload((string)($siteRow['payload'] ?? ''));
                if ((int)($sitePayload['customerRecordId'] ?? 0) === $customer['id'] &&
                    trim((string)($sitePayload['address'] ?? $sitePayload['location'] ?? '')) === $location) {
                    $sameSite = true;
                    break;
                }
            }
            if (!$sameSite) {
                $sitePayload = [
                    'customerRecordId' => $customer['id'],
                    'name' => trim((string)($request['client_name'] ?? '')) . ' — عنوان الطلب #' . (int)$request['id'],
                    'address' => $location,
                    'location' => $location,
                    'requestId' => (int)$request['id'],
                    'source' => 'service_request',
                    'serviceType' => (string)($request['service_type'] ?? ''),
                ];
                $insertSite->execute([
                    ':reference' => 'SITE-' . str_pad((string)$request['id'], 5, '0', STR_PAD_LEFT),
                    ':payload' => json_encode($sitePayload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
                    ':now' => $now,
                ]);
            }
        }

        if ((int)($request['customer_record_id'] ?? 0) !== $customer['id']) {
            $linkRequest->execute([':customer_id' => $customer['id'], ':id' => (int)$request['id']]);
        }
    }
}

function hsAuth(PDO $pdo, bool $managerOnly = false): array {
    $header = getAuthHeader();
    if (!$header || !preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        hsJson(['error' => 'Unauthorized'], 401);
    }
    $token = verifyToken($matches[1]);
    if (!$token || empty($token['adminId'])) hsJson(['error' => 'Unauthorized'], 401);
    $stmt = $pdo->prepare("SELECT * FROM admins WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => (int)$token['adminId']]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$admin || (isset($admin['is_active']) && (int)$admin['is_active'] === 0)) {
        hsJson(['error' => 'Unauthorized'], 401);
    }
    if ($managerOnly && !in_array((string)($admin['role'] ?? ''), ['admin', 'manager'], true)) {
        hsJson(['error' => 'ليس لديك صلاحية لهذه العملية'], 403);
    }
    $admin['id'] = (int)$admin['id'];
    return $admin;
}

function hsCanManage(array $admin, string $kind): bool {
    if (in_array((string)($admin['role'] ?? ''), ['admin', 'manager'], true)) return true;
    $permissions = json_decode((string)($admin['permissions'] ?? '[]'), true);
    if (!is_array($permissions)) $permissions = [];
    return in_array('container_system', $permissions, true)
        || in_array('container_system_' . $kind, $permissions, true);
}

function hsSupportedKinds(): array {
    return [
        'customer', 'customer_site', 'container_type', 'container', 'container_asset', 'container_assignment', 'vehicle', 'driver',
        'contract', 'contract_line', 'container_movement', 'ledger_entry', 'receipt', 'payment',
        'expense', 'deposit', 'bank_deposit', 'maintenance', 'alert', 'setting', 'branch',
        'employee', 'permit', 'appointment', 'warehouse', 'treasury', 'transfer', 'invoice',
        'invoice_return', 'category', 'category_size', 'tax', 'commission', 'oil_change',
        'salary_advance', 'salary_payment', 'fuel_expense', 'daily_expense',
        'other_revenue', 'notification', 'payment_return', 'stock_issue', 'stock_issue_return',
        'purchase', 'purchase_return',
    ];
}

function hsFinancialLifecycleKinds(): array {
    return ['receipt', 'payment', 'expense', 'deposit', 'bank_deposit', 'invoice', 'invoice_return',
        'payment_return', 'transfer', 'purchase', 'purchase_return', 'commission', 'salary_advance',
        'salary_payment', 'fuel_expense', 'daily_expense'];
}

function hsValidateFinancialLifecycle(array $admin, string $kind, string $current, string $next, array $payload): void {
    if (!in_array($kind, hsFinancialLifecycleKinds(), true) || $current === $next) return;
    $allowed = [
        'draft' => ['pending_approval', 'rejected', 'cancelled'],
        'pending_approval' => ['approved', 'rejected', 'cancelled'],
        'approved' => ['posted', 'cancelled'],
        'posted' => ['cancelled'],
        'rejected' => ['draft', 'cancelled'],
        'cancelled' => [],
    ];
    if (!isset($allowed[$next]) || !in_array($next, $allowed[$current] ?? [], true)) {
        hsJson(['error' => 'انتقال الحركة المالية غير مسموح؛ استخدم دورة الاعتماد بالترتيب'], 422);
    }
    if (in_array($next, ['approved', 'posted', 'cancelled'], true)
        && !in_array((string)($admin['role'] ?? ''), ['admin', 'manager'], true)) {
        hsJson(['error' => 'اعتماد أو إلغاء الحركة المالية يتطلب صلاحية المدير'], 422);
    }
    if ($next === 'cancelled' && mb_strlen(trim((string)($payload['cancellationReason'] ?? $payload['reason'] ?? ''))) < 3) {
        hsJson(['error' => 'سبب إلغاء الحركة المالية مطلوب'], 422);
    }
}

function hsReference(string $kind, array $payload, int $id): string {
    if (!empty($payload['reference'])) return (string)$payload['reference'];
    if (!empty($payload['code'])) return (string)$payload['code'];
    $prefix = [
        'customer' => 'CUS', 'container' => 'CONT', 'container_asset' => 'CONT',
        'container_type' => 'CT', 'vehicle' => 'CAR', 'driver' => 'DRV',
        'contract' => 'RNT', 'contract_line' => 'LINE', 'customer_site' => 'SITE', 'container_assignment' => 'ASN', 'invoice' => 'INV',
        'receipt' => 'RCV', 'payment' => 'PAY', 'expense' => 'EXP',
        'maintenance' => 'MNT', 'bank_deposit' => 'DEP', 'appointment' => 'APT',
    ][$kind] ?? 'REC';
    return $prefix . '-' . str_pad((string)$id, 5, '0', STR_PAD_LEFT);
}

function hsAssetCode(array $payload): string {
    return trim((string)($payload['assetCode'] ?? $payload['code'] ?? ''));
}

function hsCanonicalAssetStatus(string $value, string $fallback = 'available'): string {
    $aliases = [
        'متاح' => 'available', 'متاحة' => 'available', 'جاهز' => 'available',
        'جاهزة' => 'available', 'مؤجر' => 'rented', 'مؤجرة' => 'rented',
        'لدى العميل' => 'rented', 'في الطريق' => 'in_transit', 'تحت الفحص' => 'inspection',
        'صيانة' => 'maintenance', 'في الصيانة' => 'maintenance', 'تالف' => 'damaged',
        'تالفة' => 'damaged', 'مفقود' => 'lost', 'مفقودة' => 'lost',
        'خارج الخدمة' => 'out_of_service',
    ];
    $value = trim(mb_strtolower($value));
    return $aliases[$value] ?? ($value !== '' ? $value : $fallback);
}

function hsMovementStatus(string $type): ?string {
    $type = mb_strtolower(trim($type));
    return [
        'delivery' => 'rented', 'deliver' => 'rented', 'تسليم' => 'rented',
        'replacement' => 'in_transit', 'swap' => 'in_transit', 'تبديل' => 'in_transit',
        'تبديل حاوية' => 'in_transit', 'unloading' => 'in_transit', 'emptying' => 'in_transit',
        'تفريغ' => 'in_transit', 'withdrawal' => 'in_transit', 'withdraw' => 'in_transit',
        'سحب' => 'in_transit', 'return' => 'available', 'returned' => 'available',
        'استرجاع' => 'available', 'maintenance' => 'maintenance', 'صيانة' => 'maintenance',
    ][$type] ?? null;
}

function hsMovementAllowed(string $current, string $type): bool {
    $current = hsCanonicalAssetStatus($current, $current);
    $type = mb_strtolower(trim($type));
    if (in_array($type, ['delivery', 'deliver', 'تسليم'], true)) return in_array($current, ['available', 'reserved', 'inspection'], true);
    if (in_array($type, ['replacement', 'swap', 'تبديل', 'تبديل حاوية', 'unloading', 'emptying', 'تفريغ', 'withdrawal', 'withdraw', 'سحب'], true)) {
        return in_array($current, ['rented', 'with_customer', 'awaiting_return', 'in_transit'], true);
    }
    if (in_array($type, ['return', 'returned', 'استرجاع'], true)) return in_array($current, ['rented', 'with_customer', 'awaiting_return', 'in_transit', 'damaged'], true);
    if (in_array($type, ['maintenance', 'صيانة'], true)) return !in_array($current, ['lost', 'out_of_service'], true);
    return false;
}

function hsFindRecords(PDO $pdo, ?string $kind = null, ?string $status = null, string $search = ''): array {
    $sql = "SELECT * FROM container_system_records WHERE 1=1";
    $params = [];
    if ($kind) { $sql .= " AND kind = :kind"; $params[':kind'] = $kind; }
    if ($status) { $sql .= " AND status = :status"; $params[':status'] = $status; }
    if ($search !== '') { $sql .= " AND payload LIKE :search"; $params[':search'] = '%' . $search . '%'; }
    $sql .= " ORDER BY updated_at DESC, id DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function hsFindAsset(PDO $pdo, string $code): ?array {
    $code = trim($code);
    if ($code === '') return null;
    foreach (hsFindRecords($pdo) as $row) {
        if (in_array($row['kind'], ['container', 'container_asset'], true) && $row['status'] !== 'archived' && hsAssetCode(hsPayload($row['payload'])) === $code) return $row;
    }
    return null;
}

function hsNormalizeFinancial(string $kind, array $payload): array {
    $payload['currency'] = strtoupper(trim((string)($payload['currency'] ?? 'SAR'))) ?: 'SAR';
    $amount = (float)($payload['amount'] ?? $payload['subtotal'] ?? 0);
    $taxRate = (float)($payload['taxRate'] ?? 15);
    if ($kind === 'invoice' || $kind === 'contract') {
        $payload['taxRate'] = $taxRate;
        if (($payload['taxInclusive'] ?? false) === true || strtolower((string)($payload['taxInclusive'] ?? '')) === 'true') {
            $payload['total'] = round($amount, 2);
            $payload['taxAmount'] = round($amount - ($amount / (1 + $taxRate / 100)), 2);
            $payload['amount'] = round($amount - $payload['taxAmount'], 2);
        } else {
            $payload['amount'] = round($amount, 2);
            $payload['taxAmount'] = round($amount * $taxRate / 100, 2);
            $payload['total'] = round($amount + $payload['taxAmount'], 2);
        }
        $payload['subtotal'] = $payload['amount'];
    }
    return $payload;
}

function hsValidateRecord(PDO $pdo, string $kind, array $payload, ?int $ignoreId = null): void {
    $financial = ['payment', 'receipt', 'expense', 'deposit', 'bank_deposit', 'invoice', 'invoice_return',
        'payment_return', 'transfer', 'purchase', 'purchase_return', 'commission', 'salary_advance',
        'salary_payment', 'fuel_expense', 'daily_expense'];
    if (in_array($kind, $financial, true)) {
        $amount = (float)($payload['amount'] ?? $payload['total'] ?? 0);
        if (!is_finite($amount) || $amount <= 0) hsJson(['error' => 'القيمة المالية يجب أن تكون أكبر من صفر'], 422);
    }
    if (in_array($kind, ['payment', 'receipt'], true) && trim((string)($payload['contractNumber'] ?? '')) === '' && trim((string)($payload['invoiceNumber'] ?? '')) === '') {
        hsJson(['error' => 'سند التحصيل يجب أن يرتبط برقم عقد أو فاتورة'], 422);
    }
    if ($kind === 'transfer') {
        $from = trim((string)($payload['fromTreasury'] ?? $payload['fromTreasuryId'] ?? ''));
        $to = trim((string)($payload['toTreasury'] ?? $payload['toTreasuryId'] ?? ''));
        if ($from === '' || $to === '') hsJson(['error' => 'الخزينة المصدر والخزينة المستلمة مطلوبتان'], 422);
        if ($from === $to) hsJson(['error' => 'لا يمكن التحويل إلى نفس الخزينة'], 422);
        $treasuries = hsFindRecords($pdo, 'treasury');
        foreach ([$from, $to] as $treasuryId) {
            $found = false;
            foreach ($treasuries as $treasury) {
                $tp = hsPayload($treasury['payload']);
                if ((string)$treasury['id'] === $treasuryId || (string)($tp['code'] ?? $treasury['reference']) === $treasuryId) { $found = true; break; }
            }
            if (!$found) hsJson(['error' => 'الخزينة المرتبطة بالتحويل غير موجودة'], 422);
        }
    }
    if ($kind === 'invoice_return' && trim((string)($payload['invoiceNumber'] ?? $payload['originalInvoiceNumber'] ?? '')) === '') {
        hsJson(['error' => 'يجب تحديد الفاتورة الأصلية قبل تسجيل المرتجع'], 422);
    }
    if ($kind === 'payment_return') {
        $originalId = (int)($payload['originalPaymentId'] ?? 0);
        if ($originalId <= 0) hsJson(['error' => 'يجب تحديد السداد الأصلي قبل تسجيل مرتجع السداد'], 422);
        $originals = hsFindRecords($pdo);
        $original = array_filter($originals, static fn(array $row): bool =>
            (int)$row['id'] === $originalId && in_array($row['kind'], ['payment', 'receipt'], true) && $row['status'] !== 'archived');
        if (!$original) hsJson(['error' => 'السداد الأصلي للمرتجع غير موجود'], 422);
    }
    if (in_array($kind, ['purchase_return', 'stock_issue_return'], true)) {
        $originalId = (int)($payload['originalPurchaseId'] ?? $payload['originalStockIssueId'] ?? 0);
        $expectedKind = $kind === 'purchase_return' ? 'purchase' : 'stock_issue';
        if ($originalId <= 0) hsJson(['error' => 'يجب تحديد المستند الأصلي قبل تسجيل المرتجع'], 422);
        $originals = hsFindRecords($pdo, $expectedKind);
        if (!array_filter($originals, static fn(array $row): bool => (int)$row['id'] === $originalId && $row['status'] !== 'archived')) {
            hsJson(['error' => 'المستند الأصلي للمرتجع غير موجود أو مؤرشف'], 422);
        }
    }
    if (in_array($kind, ['salary_advance', 'salary_payment', 'commission'], true)) {
        $employeeId = (int)($payload['employeeRecordId'] ?? $payload['employeeId'] ?? 0);
        if ($employeeId <= 0 || !array_filter(hsFindRecords($pdo, 'employee'), static fn(array $row): bool => (int)$row['id'] === $employeeId && $row['status'] !== 'archived')) {
            hsJson(['error' => 'يجب ربط الحركة المالية بموظف رسمي'], 422);
        }
    }
    if (in_array($kind, ['stock_issue', 'stock_issue_return', 'purchase'], true)) {
        $warehouseId = (int)($payload['warehouseRecordId'] ?? $payload['warehouseId'] ?? 0);
        if ($warehouseId <= 0 || !array_filter(hsFindRecords($pdo, 'warehouse'), static fn(array $row): bool => (int)$row['id'] === $warehouseId && $row['status'] !== 'archived')) {
            hsJson(['error' => 'يجب ربط حركة المخزون بمستودع رسمي'], 422);
        }
    }
    if (in_array($kind, ['container', 'container_asset'], true)) {
        $code = hsAssetCode($payload);
        if ($code === '') hsJson(['error' => 'رقم أصل الحاوية مطلوب'], 422);
        foreach (hsFindRecords($pdo) as $row) {
            if ($row['id'] !== $ignoreId && in_array($row['kind'], ['container', 'container_asset'], true) && $row['status'] !== 'archived' && hsAssetCode(hsPayload($row['payload'])) === $code) {
                hsJson(['error' => 'رقم أصل الحاوية مستخدم مسبقًا'], 409);
            }
        }
    }
    if ($kind === 'contract') {
        $start = trim((string)($payload['startDate'] ?? ''));
        $end = trim((string)($payload['endDate'] ?? ''));
        if ($start && $end && strtotime($end) < strtotime($start)) hsJson(['error' => 'نهاية العقد يجب أن تكون بعد بدايته'], 422);
        $code = trim((string)($payload['containerCode'] ?? ''));
        if (in_array((string)($payload['status'] ?? 'active'), ['active', 'issued', 'scheduled', 'delivered'], true) && $code === '') {
            hsJson(['error' => 'العقد التشغيلي يجب أن يرتبط بحاوية'], 422);
        }
        if ($code && !hsFindAsset($pdo, $code)) hsJson(['error' => 'الحاوية المرتبطة بالعقد غير موجودة'], 422);
    }
    $numberFields = ['contract' => 'contractNumber', 'invoice' => 'invoiceNumber', 'receipt' => 'receiptNumber'];
    if (isset($numberFields[$kind])) {
        $field = $numberFields[$kind];
        $number = trim((string)($payload[$field] ?? ''));
        if ($number !== '') {
            foreach (hsFindRecords($pdo, $kind) as $row) {
                if ((int)$row['id'] !== $ignoreId && $row['status'] !== 'archived' && trim((string)(hsPayload($row['payload'])[$field] ?? $row['reference'])) === $number) {
                    hsJson(['error' => 'رقم المستند مستخدم مسبقًا'], 409);
                }
            }
        }
    }
    if ($kind === 'container_movement') {
        $code = trim((string)($payload['containerCode'] ?? ''));
        $type = trim((string)($payload['movementType'] ?? ''));
        $asset = hsFindAsset($pdo, $code);
        if ($code === '' || $type === '') hsJson(['error' => 'رقم الحاوية ونوع الحركة مطلوبان'], 422);
        if (!$asset) hsJson(['error' => 'الحاوية المرتبطة بالحركة غير موجودة'], 422);
        if (!hsMovementStatus($type)) hsJson(['error' => 'نوع حركة الحاوية غير مدعوم'], 422);
        if (!hsMovementAllowed((string)$asset['status'], $type)) hsJson(['error' => 'الحركة غير مسموحة للحالة الحالية للحاوية'], 422);
        foreach (['locationLat' => [-90, 90], 'locationLng' => [-180, 180]] as $key => $range) {
            if (($payload[$key] ?? '') !== '' && (!is_numeric($payload[$key]) || (float)$payload[$key] < $range[0] || (float)$payload[$key] > $range[1])) {
                hsJson(['error' => $key === 'locationLat' ? 'خط العرض غير صحيح' : 'خط الطول غير صحيح'], 422);
            }
        }
    }
}

function hsAudit(PDO $pdo, int $recordId, string $kind, string $action, ?string $before, ?string $after, int $actorId): void {
    $stmt = $pdo->prepare("INSERT INTO container_system_audit (record_id, kind, action, before_payload, after_payload, actor_id, created_at) VALUES (:record_id, :kind, :action, :before_payload, :after_payload, :actor_id, :created_at)");
    $stmt->execute([
        ':record_id' => $recordId, ':kind' => $kind, ':action' => $action,
        ':before_payload' => $before, ':after_payload' => $after, ':actor_id' => $actorId,
        ':created_at' => date('c'),
    ]);
}

function hsSyncMovement(PDO $pdo, array $payload, int $actorId): void {
    $asset = hsFindAsset($pdo, (string)($payload['containerCode'] ?? ''));
    if (!$asset) throw new RuntimeException('الحاوية المرتبطة بالحركة غير موجودة');
    $nextStatus = hsMovementStatus((string)($payload['movementType'] ?? ''));
    if (!$nextStatus || !hsMovementAllowed((string)$asset['status'], (string)($payload['movementType'] ?? ''))) {
        throw new RuntimeException('الحركة غير مسموحة للحالة الحالية للحاوية');
    }
    $before = $asset['payload'];
    $next = hsPayload($before);
    $next['location'] = $payload['location'] ?? ($next['location'] ?? '');
    $next['lastMovementAt'] = date('c');
    $stmt = $pdo->prepare("UPDATE container_system_records SET status = :status, payload = :payload, updated_at = :updated_at WHERE id = :id");
    $stmt->execute([':status' => $nextStatus, ':payload' => json_encode($next, JSON_UNESCAPED_UNICODE), ':updated_at' => date('c'), ':id' => (int)$asset['id']]);
    hsAudit($pdo, (int)$asset['id'], (string)$asset['kind'], 'movement_sync', $before, json_encode($next, JSON_UNESCAPED_UNICODE), $actorId);
}

function hostingerContainerSystemRoute(PDO $pdo, string $path, string $method, array $input): void {
    if (!str_starts_with($path, '/admin/container-system')) return;
    hsEnsureSchema($pdo);
    // Repair orders created before customer indexing was deployed. This keeps
    // Hostinger self-contained and makes the customer list an authoritative
    // projection of all historical service requests.
    hsSyncRequestsToCustomers($pdo);
    $admin = hsAuth($pdo);
    $actorId = (int)$admin['id'];

    if ($path === '/admin/container-system' && $method === 'GET') {
        $records = array_map('hsRecord', hsFindRecords($pdo));
        $payments = [];
        foreach ($records as $record) {
            if (in_array($record['kind'], ['payment', 'receipt'], true)) {
                if (is_array($record['payload']['allocations'] ?? null)) {
                    foreach ($record['payload']['allocations'] as $allocation) {
                        $key = (string)($allocation['contractNumber'] ?? '');
                        if ($key) $payments[$key] = ($payments[$key] ?? 0) + (float)($allocation['amount'] ?? 0);
                    }
                } else {
                    $key = (string)($record['payload']['contractNumber'] ?? '');
                    if ($key) $payments[$key] = ($payments[$key] ?? 0) + (float)($record['payload']['amount'] ?? 0);
                }
            }
        }
        $contracts = [];
        foreach ($records as $record) {
            if ($record['kind'] !== 'contract') continue;
            $number = (string)($record['payload']['contractNumber'] ?? $record['reference']);
            $record['payload']['paid'] = $payments[$number] ?? 0;
            $record['payload']['remaining'] = max((float)($record['payload']['total'] ?? $record['payload']['amount'] ?? 0) - $record['payload']['paid'], 0);
            $contracts[] = $record;
        }
        $countKind = static fn(string $kind): int => count(array_filter($records, static fn(array $r): bool => $r['kind'] === $kind));
        $assets = array_filter($records, static fn(array $r): bool => in_array($r['kind'], ['container', 'container_asset'], true));
        $rented = count(array_filter($assets, static fn(array $r): bool => $r['status'] === 'rented'));
        $value = array_sum(array_map(static fn(array $r): float => (float)($r['payload']['total'] ?? 0), $contracts));
        $collected = array_sum($payments);
        $expenses = array_sum(array_map(static fn(array $r): float => (float)($r['payload']['amount'] ?? 0), array_filter($records, static fn(array $r): bool => in_array($r['kind'], ['expense', 'fuel_expense', 'daily_expense'], true))));
        hsJson([
            'summary' => [
                'customers' => $countKind('customer'), 'containers' => count($assets),
                'availableContainers' => count(array_filter($assets, static fn(array $r): bool => $r['status'] === 'available')),
                'rentedContainers' => $rented, 'activeContracts' => count(array_filter($contracts, static fn(array $r): bool => in_array($r['status'], ['active', 'issued', 'scheduled', 'delivered'], true))),
                'containerMovements' => $countKind('container_movement'), 'collected' => $collected,
                'contractValue' => $value, 'debt' => max($value - $collected, 0), 'expenses' => $expenses,
                'maintenanceCost' => 0, 'vehicles' => $countKind('vehicle'), 'vehiclesReady' => count(array_filter($records, static fn(array $r): bool => $r['kind'] === 'vehicle' && $r['status'] === 'available')),
                'openLedgerEntries' => count(array_filter($records, static fn(array $r): bool => $r['kind'] === 'ledger_entry' && $r['status'] === 'open')),
                'expiringContracts' => 0, 'fleetUtilization' => 0,
                'containerUtilization' => count($assets) ? (int)round($rented / count($assets) * 100) : 0,
                'maintenanceDue' => 0,
            ],
            'records' => $records, 'expiringContracts' => [], 'recent' => array_slice($records, 0, 12),
        ]);
    }
    if ($path === '/admin/container-system/contracts/workflow' && $method === 'POST') {
        if (!hsCanManage($admin, 'contract')) hsJson(['error' => 'ليس لديك صلاحية لهذه العملية'], 403);
        $contract = is_array($input['contract'] ?? null) ? $input['contract'] : [];
        $assignment = is_array($input['assignment'] ?? null) ? $input['assignment'] : [];
        $appointment = is_array($input['appointment'] ?? null) ? $input['appointment'] : [];
        $service = is_array($input['serviceRequest'] ?? null) ? $input['serviceRequest'] : [];
        $contract = hsNormalizeFinancial('contract', $contract);
        $customerId = (int)($contract['customerRecordId'] ?? 0);
        $siteId = (int)($assignment['siteRecordId'] ?? $contract['siteRecordId'] ?? 0);
        $assetId = (int)($assignment['containerRecordId'] ?? $contract['containerRecordId'] ?? 0);
        if ($customerId <= 0 || $siteId <= 0 || $assetId <= 0) {
            hsJson(['error' => 'العميل والموقع وأصل الحاوية مطلوبة لإنشاء دورة العقد'], 422);
        }
        $operationKey = trim((string)($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? $input['operationKey'] ?? ''));
        if ($operationKey !== '' && (strlen($operationKey) < 8 || strlen($operationKey) > 160)) {
            hsJson(['error' => 'مفتاح العملية غير صالح'], 422);
        }
        if ($operationKey !== '') $contract['operationKey'] = $operationKey;
        $find = static function (PDO $pdo, int $id): ?array {
            $stmt = $pdo->prepare("SELECT * FROM container_system_records WHERE id = :id LIMIT 1");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        };
        $customer = $find($pdo, $customerId);
        $site = $find($pdo, $siteId);
        $asset = $find($pdo, $assetId);
        if (!$customer || $customer['kind'] !== 'customer' || $customer['status'] === 'archived') hsJson(['error' => 'العميل غير موجود'], 422);
        if (!$site || $site['kind'] !== 'customer_site' || $site['status'] === 'archived') hsJson(['error' => 'موقع العميل غير موجود'], 422);
        if ((int)(hsPayload($site['payload'])['customerRecordId'] ?? 0) !== $customerId) hsJson(['error' => 'الموقع لا يتبع العميل المحدد'], 422);
        if (!$asset || !in_array($asset['kind'], ['container', 'container_asset'], true) || $asset['status'] === 'archived') hsJson(['error' => 'أصل الحاوية غير موجود'], 422);
        // The row status is the record lifecycle (commonly "active"); the
        // payload carries the asset's actual availability.
        $assetPayload = hsPayload($asset['payload']);
        $assetAvailability = hsCanonicalAssetStatus((string)($assetPayload['status'] ?? $asset['status']), (string)$asset['status']);
        if (!in_array($assetAvailability, ['available', 'reserved', 'active'], true)) hsJson(['error' => 'الحاوية ليست متاحة للتخصيص'], 422);
        // The wizard selects the asset by record id. Older bundles sometimes
        // omit containerCode, so derive it from the authoritative asset row
        // before validating the contract instead of rejecting a valid request.
        if (trim((string)($contract['containerCode'] ?? '')) === '') {
            $contract['containerCode'] = hsAssetCode($assetPayload);
        }
        hsValidateRecord($pdo, 'contract', $contract);
        $now = date('c');
        try {
            $pdo->beginTransaction();
            $insert = $pdo->prepare("INSERT INTO container_system_records (kind, status, reference, payload, created_by, created_at, updated_at) VALUES (:kind, :status, '', :payload, :created_by, :created_at, :updated_at)");
            $insert->execute([':kind' => 'contract', ':status' => 'active', ':payload' => json_encode($contract, JSON_UNESCAPED_UNICODE), ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
            $contractId = (int)$pdo->lastInsertId();
            $contractNumber = trim((string)($contract['contractNumber'] ?? ''));
            if ($contractNumber === '') $contractNumber = 'RNT-' . str_pad((string)$contractId, 5, '0', STR_PAD_LEFT);
            $contract['contractNumber'] = $contractNumber;
            $pdo->prepare("UPDATE container_system_records SET reference = :reference, payload = :payload WHERE id = :id")->execute([':reference' => $contractNumber, ':payload' => json_encode($contract, JSON_UNESCAPED_UNICODE), ':id' => $contractId]);
            $assignment['contractRecordId'] = $contractId; $assignment['contractNumber'] = $contractNumber; $assignment['siteRecordId'] = $siteId; $assignment['containerRecordId'] = $assetId; $assignment['assignmentStatus'] = $assignment['assignmentStatus'] ?? 'reserved';
            $insert->execute([':kind' => 'container_assignment', ':status' => 'reserved', ':payload' => json_encode($assignment, JSON_UNESCAPED_UNICODE), ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
            $assignmentId = (int)$pdo->lastInsertId();
            $pdo->prepare("UPDATE container_system_records SET reference = :reference WHERE id = :id")->execute([':reference' => 'ASSIGN-' . $assignmentId, ':id' => $assignmentId]);
            $assetPayload['assignmentRecordId'] = $assignmentId; $assetPayload['assignedContractRecordId'] = $contractId; $assetPayload['assignedSiteRecordId'] = $siteId;
            $pdo->prepare("UPDATE container_system_records SET status = 'reserved', payload = :payload, updated_at = :updated_at WHERE id = :id")->execute([':payload' => json_encode($assetPayload, JSON_UNESCAPED_UNICODE), ':updated_at' => $now, ':id' => $assetId]);
            $appointment['contractRecordId'] = $contractId; $appointment['contractNumber'] = $contractNumber; $appointment['customerRecordId'] = $customerId; $appointment['containerRecordId'] = $assetId;
            $insert->execute([':kind' => 'appointment', ':status' => 'scheduled', ':payload' => json_encode($appointment, JSON_UNESCAPED_UNICODE), ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
            $appointmentId = (int)$pdo->lastInsertId();
            $pdo->prepare("UPDATE container_system_records SET reference = :reference WHERE id = :id")->execute([':reference' => 'APT-' . $appointmentId, ':id' => $appointmentId]);
            $customerPayload = hsPayload($customer['payload']);
            // Hostinger databases may have service_requests timestamps without
            // a SQLite default. Always provide both values explicitly so the
            // workflow remains valid across old and new schemas.
            $serviceStmt = $pdo->prepare("INSERT INTO service_requests (client_name, phone, email, service_type, container_size, property_type, area_size, location, duration, notes, appointment_type, scheduled_at, customer_record_id, container_record_id, contract_record_id, created_at, updated_at) VALUES (:client_name, :phone, :email, :service_type, :container_size, :property_type, :area_size, :location, :duration, :notes, :appointment_type, :scheduled_at, :customer_record_id, :container_record_id, :contract_record_id, :created_at, :updated_at)");
            $serviceStmt->execute([':client_name' => (string)($service['clientName'] ?? $customerPayload['name'] ?? ''), ':phone' => (string)($service['phone'] ?? $customerPayload['phone'] ?? ''), ':email' => (string)($service['email'] ?? $customerPayload['email'] ?? ''), ':service_type' => (string)($service['serviceType'] ?? 'تسليم حاوية'), ':container_size' => (string)($service['containerSize'] ?? $contract['containerCode'] ?? ''), ':property_type' => (string)($service['propertyType'] ?? ''), ':area_size' => (string)($service['areaSize'] ?? ''), ':location' => (string)($service['location'] ?? $contract['location'] ?? 'يحدد لاحقًا'), ':duration' => (string)($service['duration'] ?? $contract['duration'] ?? ''), ':notes' => (string)($service['notes'] ?? $contract['notes'] ?? ''), ':appointment_type' => 'scheduled', ':scheduled_at' => (string)($service['scheduledAt'] ?? $appointment['scheduledAt'] ?? ''), ':customer_record_id' => $customerId, ':container_record_id' => $assetId, ':contract_record_id' => $contractId, ':created_at' => $now, ':updated_at' => $now]);
            $serviceId = (int)$pdo->lastInsertId();
            $pdo->commit();
            $contractRow = $find($pdo, $contractId); $assignmentRow = $find($pdo, $assignmentId); $appointmentRow = $find($pdo, $appointmentId);
            hsJson(['contract' => hsRecord($contractRow), 'assignment' => hsRecord($assignmentRow), 'appointment' => hsRecord($appointmentRow), 'serviceRequest' => ['id' => $serviceId], 'idempotent' => false], 201);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            hsJson(['error' => $error->getMessage() ?: 'تعذر إنشاء دورة العقد كاملة'], 422);
        }
    }
    if ($path === '/admin/container-system/financial/contract-ledgers' && $method === 'GET') {
        $contractId = (int)($_GET['contractId'] ?? 0);
        $search = mb_strtolower(trim((string)($_GET['search'] ?? '')));
        $rows = array_map('hsRecord', hsFindRecords($pdo));
        $contracts = array_filter($rows, static fn(array $row): bool => $row['kind'] === 'contract' && (!$contractId || (int)$row['id'] === $contractId));
        $payments = hsPostedCollections($rows);
        $returns = array_filter($rows, static fn(array $row): bool => $row['kind'] === 'payment_return' && $row['status'] === 'posted');
        $deposits = array_filter($rows, static fn(array $row): bool => in_array($row['kind'], ['deposit', 'bank_deposit'], true) && $row['status'] === 'posted');
        $ledgers = [];
        foreach ($contracts as $contract) {
            $payload = $contract['payload']; $number = (string)($payload['contractNumber'] ?? $contract['reference']);
            $relatedPayments = array_values(array_filter($payments, static function (array $row) use ($contract, $number): bool {
                if ((string)($row['payload']['contractNumber'] ?? '') === $number) return true;
                foreach (($row['payload']['allocations'] ?? []) as $allocation) {
                    if ((int)($allocation['contractId'] ?? 0) === (int)$contract['id']) return true;
                }
                return false;
            }));
            $relatedReturns = array_values(array_filter($returns, static function (array $row) use ($contract, $number): bool {
                return (string)($row['payload']['contractNumber'] ?? '') === $number
                    || (int)($row['payload']['contractId'] ?? 0) === (int)$contract['id'];
            }));
            $relatedDeposits = array_values(array_filter($deposits, static function (array $row) use ($relatedPayments, $contract, $number): bool {
                $payload = $row['payload'];
                if ((string)($payload['contractNumber'] ?? '') === $number || (int)($payload['linkedContractId'] ?? 0) === (int)$contract['id']) return true;
                foreach ($relatedPayments as $payment) {
                    if ((int)($payload['sourcePaymentId'] ?? $payload['linkedPaymentId'] ?? 0) === (int)$payment['id']) return true;
                }
                return false;
            }));
            $total = (float)($payload['total'] ?? $payload['amount'] ?? 0); $collected = array_sum(array_map(static fn(array $row): float => (float)($row['payload']['amount'] ?? 0), $relatedPayments));
            $collected = array_sum(array_map(static function (array $row) use ($contract): float {
                foreach (($row['payload']['allocations'] ?? []) as $allocation) {
                    if ((int)($allocation['contractId'] ?? 0) === (int)$contract['id']) return (float)($allocation['amount'] ?? 0);
                }
                return (float)($row['payload']['amount'] ?? 0);
            }, $relatedPayments));
            $collected -= array_sum(array_map(static fn(array $row): float => (float)($row['payload']['amount'] ?? $row['payload']['total'] ?? 0), $relatedReturns));
            if ($search !== '' && !str_contains(mb_strtolower($number . ' ' . json_encode($payload, JSON_UNESCAPED_UNICODE)), $search)) continue;
            $deposited = array_sum(array_map(static fn(array $row): float => (float)($row['payload']['amount'] ?? $row['payload']['total'] ?? 0), $relatedDeposits));
            $ledgers[] = ['contract' => $contract, 'total' => $total, 'collected' => $collected, 'deposited' => $deposited, 'remaining' => max($total - $collected, 0), 'deposits' => $relatedDeposits, 'payments' => $relatedPayments];
        }
        hsJson(['ledgers' => $ledgers, 'totals' => ['contractValue' => array_sum(array_column($ledgers, 'total')), 'collected' => array_sum(array_column($ledgers, 'collected')), 'deposited' => array_sum(array_column($ledgers, 'deposited')), 'remaining' => array_sum(array_column($ledgers, 'remaining'))]]);
    }
    if ($path === '/admin/container-system/financial/settle' && $method === 'POST') {
        if (!hsCanManage($admin, 'payment')) hsJson(['error' => 'ليس لديك صلاحية تسجيل تحصيل العقود'], 403);
        $amount = (float)($input['amount'] ?? 0);
        $methodName = trim((string)($input['paymentMethod'] ?? ''));
        $operationKey = trim((string)($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? $input['operationKey'] ?? ''));
        $requested = is_array($input['allocations'] ?? null) && count($input['allocations']) > 0
            ? $input['allocations']
            : (isset($input['contractId']) ? [['contractId' => $input['contractId'], 'amount' => $amount, 'invoiceId' => $input['invoiceId'] ?? null]] : []);
        if ($amount <= 0 || $methodName === '' || strlen($operationKey) < 8 || strlen($operationKey) > 160 || count($requested) === 0) hsJson(['error' => 'بيانات التحصيل أو التوزيع غير صحيحة'], 422);
        $allocations = array_map(static fn(array $item): array => ['contractId' => (int)($item['contractId'] ?? 0), 'amount' => (float)($item['amount'] ?? 0), 'invoiceId' => isset($item['invoiceId']) && $item['invoiceId'] !== null ? (int)$item['invoiceId'] : null], $requested);
        if (abs(array_sum(array_column($allocations, 'amount')) - $amount) > 0.01 || count(array_unique(array_column($allocations, 'contractId'))) !== count($allocations) || array_filter($allocations, static fn(array $item): bool => $item['contractId'] <= 0 || $item['amount'] <= 0) !== []) hsJson(['error' => 'يجب أن يساوي مجموع التوزيعات مبلغ التحصيل دون تكرار العقود'], 422);
        $rows = array_map('hsRecord', hsFindRecords($pdo));
        foreach ($rows as $row) {
            if ($row['kind'] === 'payment' && (string)($row['payload']['operationKey'] ?? '') === $operationKey) {
                if ((float)($row['payload']['amount'] ?? 0) !== $amount || json_encode($row['payload']['allocations'] ?? [], JSON_UNESCAPED_UNICODE) !== json_encode($allocations, JSON_UNESCAPED_UNICODE)) hsJson(['error' => 'مفتاح العملية مستخدم لحمولة مختلفة'], 409);
                $ledger = null;
                foreach ($rows as $candidate) if ($candidate['kind'] === 'ledger_entry' && (int)($candidate['payload']['sourceId'] ?? 0) === (int)$row['id']) { $ledger = $candidate; break; }
                hsJson(['payment' => $row, 'ledgerEntry' => $ledger, 'idempotent' => true]);
            }
        }
        $contractRows = [];
        foreach ($allocations as $allocation) {
            $contract = null;
            foreach ($rows as $row) if ($row['kind'] === 'contract' && (int)$row['id'] === $allocation['contractId'] && $row['status'] !== 'archived') $contract = $row;
            if (!$contract) hsJson(['error' => 'أحد العقود غير موجود أو مؤرشف'], 422);
            $number = (string)($contract['payload']['contractNumber'] ?? $contract['reference']);
            $paid = 0.0;
            foreach (hsPostedCollections($rows) as $row) {
                foreach (($row['payload']['allocations'] ?? []) as $item) {
                    if ((int)($item['contractId'] ?? 0) === $allocation['contractId']) $paid += (float)($item['amount'] ?? 0);
                }
                if (!isset($row['payload']['allocations']) && (string)($row['payload']['contractNumber'] ?? '') === $number) $paid += (float)($row['payload']['amount'] ?? 0);
            }
            $total = (float)($contract['payload']['total'] ?? $contract['payload']['amount'] ?? 0);
            if ($total > 0 && $paid + $allocation['amount'] > $total + 0.01) hsJson(['error' => 'قيمة التحصيل تتجاوز المتبقي في العقد'], 422);
            if ($allocation['invoiceId']) {
                $invoice = null; foreach ($rows as $row) if ($row['kind'] === 'invoice' && (int)$row['id'] === $allocation['invoiceId']) $invoice = $row;
                 if (!$invoice || $invoice['status'] !== 'posted' || ((int)($invoice['payload']['contractRecordId'] ?? 0) !== $allocation['contractId'] && (string)($invoice['payload']['contractNumber'] ?? '') !== $number)) hsJson(['error' => 'الفاتورة لا تتبع العقد المحدد أو غير مرحّلة'], 422);
                 $invoiceTotal = (float)($invoice['payload']['total'] ?? $invoice['payload']['amount'] ?? 0);
                 $invoicePaid = 0.0;
                 foreach (hsPostedCollections($rows) as $payment) {
                     foreach (($payment['payload']['allocations'] ?? []) as $item) {
                         if ((int)($item['invoiceId'] ?? 0) === $allocation['invoiceId']) $invoicePaid += (float)($item['amount'] ?? 0);
                     }
                     if (!isset($payment['payload']['allocations']) && (int)($payment['payload']['invoiceRecordId'] ?? 0) === $allocation['invoiceId']) {
                         $invoicePaid += (float)($payment['payload']['amount'] ?? 0);
                     }
                 }
                 if ($invoiceTotal > 0 && $invoicePaid + $allocation['amount'] > $invoiceTotal + 0.01) hsJson(['error' => 'قيمة التحصيل تتجاوز المتبقي في الفاتورة'], 422);
            }
            $contractRows[] = ['contract' => $contract, 'number' => $number, 'paid' => $paid, 'total' => $total];
        }
        $first = $contractRows[0]; $now = date('c');
        $paymentPayload = ['operationKey' => $operationKey, 'contractId' => $first['contract']['id'], 'contractNumber' => $first['number'], 'customerRecordId' => $first['contract']['payload']['customerRecordId'] ?? null, 'customerName' => $first['contract']['payload']['customerName'] ?? '', 'amount' => $amount, 'paymentMethod' => $methodName, 'invoiceRecordId' => $allocations[0]['invoiceId'], 'date' => $input['date'] ?? date('Y-m-d'), 'notes' => $input['notes'] ?? '', 'allocations' => array_map(static fn(array $item): array => $item, $allocations)];
            $customerIds = array_unique(array_filter(array_map(static fn(array $item): string => (string)($item['contract']['payload']['customerRecordId'] ?? ''), $contractRows)));
            if (count($customerIds) > 1) hsJson(['error' => 'لا يمكن توزيع تحصيل واحد على عقود لعملاء مختلفين'], 422);
            $deposit = null;
            if (!empty($input['depositId'])) {
                foreach ($rows as $row) if ((int)$row['id'] === (int)$input['depositId'] && in_array($row['kind'], ['deposit', 'bank_deposit'], true) && $row['status'] !== 'archived') $deposit = $row;
                if (!$deposit) hsJson(['error' => 'الإيداع المرتبط غير موجود أو مؤرشف'], 422);
                if (!empty($deposit['payload']['linkedPaymentId'])) hsJson(['error' => 'الإيداع البنكي مرتبط بسداد سابق؛ أنشئ إيداعاً جديداً'], 422);
                $depositAmount = (float)($deposit['payload']['amount'] ?? $deposit['payload']['total'] ?? 0);
                if ($depositAmount > 0 && abs($depositAmount - $amount) > 0.01) hsJson(['error' => 'مبلغ الإيداع لا يطابق مبلغ السداد'], 422);
            }
            $pdo->beginTransaction();
        try {
            $insert = $pdo->prepare("INSERT INTO container_system_records (kind,status,reference,payload,operation_key,created_by,created_at,updated_at) VALUES ('payment','posted',:reference,:payload,:operation_key,:created_by,:created_at,:updated_at)");
            $insert->execute([':reference' => 'PAY-' . time(), ':payload' => json_encode($paymentPayload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), ':operation_key' => $operationKey, ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
            $paymentId = (int)$pdo->lastInsertId();
            $ledgerPayload = ['sourceKind' => 'payment', 'sourceId' => $paymentId, 'contractId' => $first['contract']['id'], 'contractNumber' => $first['number'], 'amount' => $amount, 'direction' => 'credit', 'date' => $paymentPayload['date'], 'allocations' => $allocations];
            $ledgerInsert = $pdo->prepare("INSERT INTO container_system_records (kind,status,reference,payload,created_by,created_at,updated_at) VALUES ('ledger_entry','posted',:reference,:payload,:created_by,:created_at,:updated_at)");
            $ledgerInsert->execute([':reference' => 'LED-' . $paymentId, ':payload' => json_encode($ledgerPayload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
            $ledgerId = (int)$pdo->lastInsertId();
            foreach ($contractRows as $index => $item) {
                $next = $item['contract']['payload']; $next['paid'] = $item['paid'] + $allocations[$index]['amount']; $next['remaining'] = max($item['total'] - $next['paid'], 0);
                $pdo->prepare("UPDATE container_system_records SET payload=:payload,status=:status,updated_at=:updated_at WHERE id=:id")->execute([':payload' => json_encode($next, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), ':status' => $next['remaining'] <= 0.01 && $item['total'] > 0 ? 'settled' : $item['contract']['status'], ':updated_at' => $now, ':id' => $item['contract']['id']]);
            }
            if ($deposit) {
                $depositPayload = $deposit['payload'];
                $depositPayload['linkedContractId'] = $first['contract']['id'];
                $depositPayload['linkedPaymentId'] = $paymentId;
                $pdo->prepare("UPDATE container_system_records SET payload=:payload,updated_at=:updated_at WHERE id=:id")->execute([':payload' => json_encode($depositPayload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), ':updated_at' => $now, ':id' => $deposit['id']]);
            }
            $pdo->commit();
            $created = $pdo->prepare("SELECT * FROM container_system_records WHERE id = :id LIMIT 1");
            $created->execute([':id' => $paymentId]);
            $ledgerCreated = $pdo->prepare("SELECT * FROM container_system_records WHERE id = :id LIMIT 1");
            $ledgerCreated->execute([':id' => $ledgerId]);
            hsJson(['payment' => hsRecord($created->fetch(PDO::FETCH_ASSOC)), 'ledgerEntry' => hsRecord($ledgerCreated->fetch(PDO::FETCH_ASSOC)), 'idempotent' => false], 201);
        } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); hsJson(['error' => $error->getMessage()], 422); }
    }
    if ($path === '/admin/container-system/records' && $method === 'GET') {
        $kind = isset($_GET['kind']) ? (string)$_GET['kind'] : null;
        $status = isset($_GET['status']) ? (string)$_GET['status'] : null;
        $search = isset($_GET['search']) ? trim((string)$_GET['search']) : '';
        hsJson(array_map('hsRecord', hsFindRecords($pdo, $kind, $status, $search)));
    }
    if ($path === '/admin/container-system/audit' && $method === 'GET') {
        $rows = $pdo->query("SELECT * FROM container_system_audit ORDER BY created_at DESC, id DESC LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
        hsJson(array_map(static function(array $row): array {
            $row['id'] = (int)$row['id'];
            $row['recordId'] = isset($row['record_id']) ? (int)$row['record_id'] : null;
            $row['actorId'] = isset($row['actor_id']) ? (int)$row['actor_id'] : null;
            $row['createdAt'] = $row['created_at'] ?? null;
            unset($row['record_id'], $row['actor_id'], $row['created_at']);
            return $row;
        }, $rows));
    }
    if (preg_match('#^/admin/container-system/records/(\d+)$#', $path, $matches)) {
        $id = (int)$matches[1];
        $stmt = $pdo->prepare("SELECT * FROM container_system_records WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $current = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$current) hsJson(['error' => 'السجل غير موجود'], 404);
        if (!hsCanManage($admin, (string)$current['kind'])) hsJson(['error' => 'ليس لديك صلاحية لهذه العملية'], 403);
        if ($method === 'DELETE') {
            if ($current['kind'] === 'container_movement') hsJson(['error' => 'لا يمكن أرشفة حركة تشغيلية بعد تسجيلها'], 409);
            if ($current['kind'] === 'ledger_entry') hsJson(['error' => 'لا يمكن أرشفة قيد الأستاذ مباشرة؛ صحح المستند المالي الأصلي بحركة عكسية موثقة'], 409);
            $pdo->beginTransaction();
            try {
                $pdo->prepare("UPDATE container_system_records SET status = 'archived', updated_at = :now WHERE id = :id")->execute([':now' => date('c'), ':id' => $id]);
                hsAudit($pdo, $id, (string)$current['kind'], 'archive', $current['payload'], null, $actorId);
                $pdo->commit();
            } catch (Throwable $error) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $error;
            }
            http_response_code(204); exit;
        }
        if ($method === 'PATCH') {
            if ($current['kind'] === 'container_movement') hsJson(['error' => 'حركة التشغيل لا تُعدّل بعد تسجيلها'], 409);
            if ($current['kind'] === 'ledger_entry') hsJson(['error' => 'قيد الأستاذ لا يُعدّل مباشرة؛ صحح المستند المالي الأصلي بحركة عكسية موثقة'], 409);
            $payload = array_merge(hsPayload($current['payload']), is_array($input['payload'] ?? null) ? $input['payload'] : []);
            $payload = hsNormalizeFinancial((string)$current['kind'], $payload);
            $nextStatus = (string)($input['status'] ?? $current['status']);
            hsValidateFinancialLifecycle($admin, (string)$current['kind'], (string)$current['status'], $nextStatus, $payload);
            if (in_array((string)$current['kind'], hsFinancialLifecycleKinds(), true)
                && in_array((string)$current['status'], ['approved', 'posted', 'cancelled'], true)
                && isset($input['payload'])
                && json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) !== $current['payload']
                && $nextStatus === (string)$current['status']) {
                hsJson(['error' => 'الحركة المالية المعتمدة لا تعدل مباشرة؛ أنشئ تصحيحاً أو ألغها بسبب موثق'], 409);
            }
            if (in_array((string)$current['kind'], hsFinancialLifecycleKinds(), true) && in_array($nextStatus, ['approved', 'posted'], true)) {
                $payload['approvedAt'] = date('c');
                $payload['approvedBy'] = (int)$admin['id'];
            }
            if (in_array((string)$current['kind'], hsFinancialLifecycleKinds(), true) && $nextStatus === 'cancelled') {
                $payload['cancelledAt'] = date('c');
                $payload['cancelledBy'] = (int)$admin['id'];
            }
            hsValidateRecord($pdo, (string)$current['kind'], $payload, $id);
            if (in_array($current['kind'], ['container', 'container_asset'], true)) $nextStatus = hsCanonicalAssetStatus((string)($payload['status'] ?? ''), $nextStatus);
            $pdo->beginTransaction();
            try {
                $now = date('c');
                $pdo->prepare("UPDATE container_system_records SET status = :status, payload = :payload, updated_at = :updated_at WHERE id = :id")->execute([
                    ':status' => $nextStatus, ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE), ':updated_at' => $now, ':id' => $id,
                ]);
                hsAudit($pdo, $id, (string)$current['kind'], 'update', $current['payload'], json_encode($payload, JSON_UNESCAPED_UNICODE), $actorId);
                if (in_array((string)$current['kind'], hsFinancialLifecycleKinds(), true) && $current['status'] !== $nextStatus) {
                    hsAudit($pdo, $id, (string)$current['kind'], $nextStatus === 'cancelled' ? 'financial_cancel' : 'financial_status_change',
                        json_encode(['status' => $current['status']], JSON_UNESCAPED_UNICODE),
                        json_encode(['status' => $nextStatus, 'reason' => $payload['reason'] ?? $payload['cancellationReason'] ?? ''], JSON_UNESCAPED_UNICODE),
                        $actorId);
                }
                if (in_array((string)$current['kind'], hsFinancialLifecycleKinds(), true)
                    && (string)$current['status'] === 'posted' && $nextStatus === 'cancelled') {
                    $reversalExists = $pdo->prepare("SELECT id FROM container_system_records WHERE kind = 'ledger_entry' AND status = 'posted' AND json_extract(payload, '$.entryType') = 'reversal' AND json_extract(payload, '$.originalRecordId') = :id LIMIT 1");
                    $reversalExists->execute([':id' => $id]);
                    if (!$reversalExists->fetchColumn()) {
                        $originalLedgerStmt = $pdo->prepare("SELECT payload, id FROM container_system_records WHERE kind = 'ledger_entry' AND status = 'posted' AND json_extract(payload, '$.sourceId') = :id LIMIT 1");
                        $originalLedgerStmt->execute([':id' => $id]);
                        $originalLedger = $originalLedgerStmt->fetch(PDO::FETCH_ASSOC);
                        $originalLedgerPayload = hsPayload($originalLedger['payload'] ?? null);
                        $originalAmount = (float)($originalLedgerPayload['amount'] ?? $payload['amount'] ?? $payload['total'] ?? 0);
                        $reversalPayload = [
                            'entryType' => 'reversal', 'sourceKind' => $current['kind'], 'sourceId' => $id,
                            'originalRecordId' => $id, 'originalLedgerId' => $originalLedger ? (int)$originalLedger['id'] : null,
                            'amount' => $originalAmount,
                            'direction' => (($originalLedgerPayload['direction'] ?? '') === 'debit') ? 'credit' : 'debit',
                            'reason' => $payload['reason'] ?? $payload['cancellationReason'] ?? 'إلغاء حركة مالية مرحّلة',
                            'date' => date('Y-m-d'),
                        ];
                        $reversalInsert = $pdo->prepare("INSERT INTO container_system_records (kind, status, reference, payload, created_by, created_at, updated_at) VALUES ('ledger_entry', 'posted', :reference, :payload, :created_by, :created_at, :updated_at)");
                        $reversalInsert->execute([
                            ':reference' => 'REV-' . $id,
                            ':payload' => json_encode($reversalPayload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
                            ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now,
                        ]);
                    }
                }
                if (in_array((string)$current['kind'], hsFinancialLifecycleKinds(), true) && $nextStatus === 'posted' && $current['status'] !== 'posted') {
                    $ledger = [
                        'sourceKind' => $current['kind'], 'sourceId' => $id,
                        'contractNumber' => $payload['contractNumber'] ?? '',
                        'contractRecordId' => isset($payload['contractRecordId']) ? (int)$payload['contractRecordId'] : null,
                        'invoiceRecordId' => isset($payload['invoiceRecordId']) ? (int)$payload['invoiceRecordId'] : null,
                        'customerName' => $payload['customerName'] ?? '',
                        'customerRecordId' => isset($payload['customerRecordId']) ? (int)$payload['customerRecordId'] : null,
                        'amount' => (float)($payload['amount'] ?? $payload['total'] ?? 0),
                        'direction' => in_array((string)$current['kind'], ['expense', 'payment_return', 'purchase', 'purchase_return'], true) ? 'debit' : 'credit',
                        'date' => $payload['date'] ?? date('Y-m-d'),
                    ];
                    if (isset($payload['allocations']) && is_array($payload['allocations'])) $ledger['allocations'] = $payload['allocations'];
                    $ledgerStmt = $pdo->prepare("INSERT INTO container_system_records (kind, status, reference, payload, created_by, created_at, updated_at) VALUES ('ledger_entry', 'posted', :reference, :payload, :created_by, :created_at, :updated_at)");
                    $ledgerStmt->execute([':reference' => 'LED-' . $id, ':payload' => json_encode($ledger, JSON_UNESCAPED_UNICODE), ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
                }
                $updated = $pdo->prepare("SELECT * FROM container_system_records WHERE id = :id");
                $updated->execute([':id' => $id]);
                $pdo->commit();
                hsJson(hsRecord($updated->fetch(PDO::FETCH_ASSOC)));
            } catch (Throwable $error) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $error;
            }
        }
    }
    if ($path === '/admin/container-system/records' && $method === 'POST') {
        $kind = trim((string)($input['kind'] ?? ''));
        $payload = is_array($input['payload'] ?? null) ? $input['payload'] : [];
        if (!in_array($kind, hsSupportedKinds(), true)) hsJson(['error' => 'نوع السجل غير مدعوم'], 400);
        if (!hsCanManage($admin, $kind)) hsJson(['error' => 'ليس لديك صلاحية لهذه العملية'], 403);
        $payload = hsNormalizeFinancial($kind, $payload);
        hsValidateRecord($pdo, $kind, $payload);
        $status = in_array($kind, ['container', 'container_asset'], true)
            ? hsCanonicalAssetStatus((string)($payload['status'] ?? ''), (string)($input['status'] ?? 'available'))
            : (in_array($kind, hsFinancialLifecycleKinds(), true)
                ? (in_array((string)($input['status'] ?? ''), ['draft', 'pending_approval', 'approved', 'posted'], true) ? (string)$input['status'] : 'draft')
                : (string)($input['status'] ?? 'active'));
        $pdo->beginTransaction();
        try {
            $now = date('c');
            $stmt = $pdo->prepare("INSERT INTO container_system_records (kind, status, reference, payload, created_by, created_at, updated_at) VALUES (:kind, :status, '', :payload, :created_by, :created_at, :updated_at)");
            $stmt->execute([':kind' => $kind, ':status' => $status, ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE), ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
            $id = (int)$pdo->lastInsertId();
            $reference = hsReference($kind, $payload, $id);
            $pdo->prepare("UPDATE container_system_records SET reference = :reference WHERE id = :id")->execute([':reference' => $reference, ':id' => $id]);
            hsAudit($pdo, $id, $kind, 'create', null, json_encode($payload, JSON_UNESCAPED_UNICODE), $actorId);
            if ($kind === 'container_movement') hsSyncMovement($pdo, $payload, $actorId);
            if (in_array($kind, ['payment', 'receipt', 'expense', 'deposit', 'bank_deposit', 'invoice', 'invoice_return', 'payment_return', 'transfer', 'purchase', 'purchase_return'], true)
                && $status === 'posted') {
                $ledger = [
                    'sourceKind' => $kind,
                    'sourceId' => $id,
                    'contractNumber' => $payload['contractNumber'] ?? '',
                    'contractRecordId' => isset($payload['contractRecordId']) ? (int)$payload['contractRecordId'] : null,
                    'invoiceRecordId' => isset($payload['invoiceRecordId']) ? (int)$payload['invoiceRecordId'] : null,
                    'customerName' => $payload['customerName'] ?? '',
                    'customerRecordId' => isset($payload['customerRecordId']) ? (int)$payload['customerRecordId'] : null,
                    'amount' => (float)($payload['amount'] ?? $payload['total'] ?? 0),
                    'direction' => in_array($kind, ['expense', 'payment_return', 'purchase', 'purchase_return'], true) ? 'debit' : 'credit',
                    'date' => $payload['date'] ?? date('Y-m-d'),
                ];
                if (isset($payload['allocations']) && is_array($payload['allocations'])) $ledger['allocations'] = $payload['allocations'];
                $ledgerStmt = $pdo->prepare("INSERT INTO container_system_records (kind, status, reference, payload, created_by, created_at, updated_at) VALUES ('ledger_entry', 'posted', :reference, :payload, :created_by, :created_at, :updated_at)");
                $ledgerStmt->execute([':reference' => 'LED-' . $id, ':payload' => json_encode($ledger, JSON_UNESCAPED_UNICODE), ':created_by' => $actorId, ':created_at' => $now, ':updated_at' => $now]);
            }
            $created = $pdo->prepare("SELECT * FROM container_system_records WHERE id = :id");
            $created->execute([':id' => $id]);
            $row = $created->fetch(PDO::FETCH_ASSOC);
            $pdo->commit();
            hsJson(hsRecord($row), 201);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }
    hsJson(['error' => 'Route not found'], 404);
}