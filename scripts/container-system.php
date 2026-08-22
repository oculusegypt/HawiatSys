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
    ];
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
    $amount = (float)($payload['amount'] ?? $payload['subtotal'] ?? 0);
    $taxRate = (float)($payload['taxRate'] ?? 15);
    if ($kind === 'invoice' || $kind === 'contract') {
        $payload['amount'] = $amount;
        $payload['taxRate'] = $taxRate;
        $payload['taxAmount'] = round($amount * $taxRate / 100, 2);
        $payload['total'] = round($amount + $payload['taxAmount'], 2);
    }
    return $payload;
}

function hsValidateRecord(PDO $pdo, string $kind, array $payload, ?int $ignoreId = null): void {
    $financial = ['payment', 'receipt', 'expense', 'deposit', 'bank_deposit', 'invoice', 'invoice_return'];
    if (in_array($kind, $financial, true)) {
        $amount = (float)($payload['amount'] ?? $payload['total'] ?? 0);
        if (!is_finite($amount) || $amount <= 0) hsJson(['error' => 'القيمة المالية يجب أن تكون أكبر من صفر'], 422);
    }
    if (in_array($kind, ['payment', 'receipt'], true) && trim((string)($payload['contractNumber'] ?? '')) === '' && trim((string)($payload['invoiceNumber'] ?? '')) === '') {
        hsJson(['error' => 'سند التحصيل يجب أن يرتبط برقم عقد أو فاتورة'], 422);
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
    $admin = hsAuth($pdo);
    $actorId = (int)$admin['id'];

    if ($path === '/admin/container-system' && $method === 'GET') {
        $records = array_map('hsRecord', hsFindRecords($pdo));
        $payments = [];
        foreach ($records as $record) {
            if (in_array($record['kind'], ['payment', 'receipt'], true)) {
                $key = (string)($record['payload']['contractNumber'] ?? '');
                if ($key) $payments[$key] = ($payments[$key] ?? 0) + (float)($record['payload']['amount'] ?? 0);
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
            $serviceStmt = $pdo->prepare("INSERT INTO service_requests (client_name, phone, email, service_type, container_size, property_type, area_size, location, duration, notes, appointment_type, scheduled_at, customer_record_id, container_record_id, contract_record_id) VALUES (:client_name, :phone, :email, :service_type, :container_size, :property_type, :area_size, :location, :duration, :notes, :appointment_type, :scheduled_at, :customer_record_id, :container_record_id, :contract_record_id)");
            $serviceStmt->execute([':client_name' => (string)($service['clientName'] ?? $customerPayload['name'] ?? ''), ':phone' => (string)($service['phone'] ?? $customerPayload['phone'] ?? ''), ':email' => (string)($service['email'] ?? $customerPayload['email'] ?? ''), ':service_type' => (string)($service['serviceType'] ?? 'تسليم حاوية'), ':container_size' => (string)($service['containerSize'] ?? $contract['containerCode'] ?? ''), ':property_type' => (string)($service['propertyType'] ?? ''), ':area_size' => (string)($service['areaSize'] ?? ''), ':location' => (string)($service['location'] ?? $contract['location'] ?? 'يحدد لاحقًا'), ':duration' => (string)($service['duration'] ?? $contract['duration'] ?? ''), ':notes' => (string)($service['notes'] ?? $contract['notes'] ?? ''), ':appointment_type' => 'scheduled', ':scheduled_at' => (string)($service['scheduledAt'] ?? $appointment['scheduledAt'] ?? ''), ':customer_record_id' => $customerId, ':container_record_id' => $assetId, ':contract_record_id' => $contractId]);
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
        $payments = array_filter($rows, static fn(array $row): bool => in_array($row['kind'], ['payment', 'receipt'], true));
        $ledgers = [];
        foreach ($contracts as $contract) {
            $payload = $contract['payload']; $number = (string)($payload['contractNumber'] ?? $contract['reference']);
            $relatedPayments = array_values(array_filter($payments, static fn(array $row): bool => (string)($row['payload']['contractNumber'] ?? '') === $number));
            $total = (float)($payload['total'] ?? $payload['amount'] ?? 0); $collected = array_sum(array_map(static fn(array $row): float => (float)($row['payload']['amount'] ?? 0), $relatedPayments));
            if ($search !== '' && !str_contains(mb_strtolower($number . ' ' . json_encode($payload, JSON_UNESCAPED_UNICODE)), $search)) continue;
            $ledgers[] = ['contract' => $contract, 'total' => $total, 'collected' => $collected, 'deposited' => 0, 'remaining' => max($total - $collected, 0), 'deposits' => [], 'payments' => $relatedPayments];
        }
        hsJson(['ledgers' => $ledgers, 'totals' => ['contractValue' => array_sum(array_column($ledgers, 'total')), 'collected' => array_sum(array_column($ledgers, 'collected')), 'deposited' => 0, 'remaining' => array_sum(array_column($ledgers, 'remaining'))]]);
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
            $payload = array_merge(hsPayload($current['payload']), is_array($input['payload'] ?? null) ? $input['payload'] : []);
            $payload = hsNormalizeFinancial((string)$current['kind'], $payload);
            hsValidateRecord($pdo, (string)$current['kind'], $payload, $id);
            $nextStatus = (string)($input['status'] ?? $current['status']);
            if (in_array($current['kind'], ['container', 'container_asset'], true)) $nextStatus = hsCanonicalAssetStatus((string)($payload['status'] ?? ''), $nextStatus);
            $pdo->beginTransaction();
            try {
                $now = date('c');
                $pdo->prepare("UPDATE container_system_records SET status = :status, payload = :payload, updated_at = :updated_at WHERE id = :id")->execute([
                    ':status' => $nextStatus, ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE), ':updated_at' => $now, ':id' => $id,
                ]);
                hsAudit($pdo, $id, (string)$current['kind'], 'update', $current['payload'], json_encode($payload, JSON_UNESCAPED_UNICODE), $actorId);
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
            : (string)($input['status'] ?? 'active');
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
            if (in_array($kind, ['payment', 'receipt', 'expense', 'deposit', 'bank_deposit'], true)) {
                $ledger = ['sourceKind' => $kind, 'sourceId' => $id, 'contractNumber' => $payload['contractNumber'] ?? '', 'customerName' => $payload['customerName'] ?? '', 'amount' => (float)($payload['amount'] ?? 0), 'direction' => $kind === 'expense' ? 'debit' : 'credit', 'date' => $payload['date'] ?? date('Y-m-d')];
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