/**
 * employees.ts — Employee (admin user) management routes
 * Only admin and manager roles can access these endpoints.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, ADMIN_ROLES, ALL_SECTIONS, ROLE_LABELS, resolvePermissions } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { hashPasswordBcrypt } from "./auth";
import { requireAdmin, requireManagerOrAdmin, requireSectionPermission, type AdminRequest } from "../middleware/adminAuth";

const router = Router();

function validateRoleAndPermissions(role: unknown, permissions: unknown) {
  if (typeof role !== "string" || !ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])) {
    return "الدور الوظيفي غير مدعوم";
  }
  if (permissions !== undefined && permissions !== null) {
    if (!Array.isArray(permissions) || permissions.some(item => typeof item !== "string" || !ALL_SECTIONS.includes(item as typeof ALL_SECTIONS[number]))) {
      return "توجد صلاحية غير مدعومة";
    }
  }
  return null;
}

// ── GET /api/admin/employees ─── list all employees ──────────────────────────
router.get("/admin/employees", requireAdmin, requireSectionPermission("employees"), requireManagerOrAdmin, async (req, res) => {
  const r = req as AdminRequest;
  const rows = await db.select({
    id:        adminsTable.id,
    username:  adminsTable.username,
    name:      adminsTable.name,
    email:     adminsTable.email,
    role:      adminsTable.role,
    permissions: adminsTable.permissions,
    isActive:  adminsTable.isActive,
    createdBy: adminsTable.createdBy,
    createdAt: adminsTable.createdAt,
  }).from(adminsTable);

  // Managers can't see other admins' data (except their own)
  const filtered = r.adminRole === "manager"
    ? rows.filter(e => e.role !== "admin" || e.id === r.adminId)
    : rows;

  return res.json(filtered.map(e => ({
    ...e,
    roleLabel: ROLE_LABELS[e.role as keyof typeof ROLE_LABELS] ?? e.role,
    permissions: e.permissions ? JSON.parse(e.permissions) : null,
  })));
});

// ── POST /api/admin/employees ─── create new employee ────────────────────────
router.post("/admin/employees", requireAdmin, requireSectionPermission("employees"), requireManagerOrAdmin, async (req, res) => {
  const r = req as AdminRequest;
  const { username, name, password, email, role, permissions } = req.body as {
    username: string; name: string; password: string;
    email?: string; role: string; permissions?: string[];
  };

  if (!username?.trim() || !name?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "اسم المستخدم والاسم وكلمة المرور مطلوبة" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
  }
  const roleError = validateRoleAndPermissions(role, permissions);
  if (roleError) return res.status(422).json({ error: roleError });

  // Managers can't create admin accounts
  if (r.adminRole === "manager" && role === "admin") {
    return res.status(403).json({ error: "المدير لا يمكنه إنشاء حسابات مدير النظام" });
  }

  // Check username uniqueness
  const [existing] = await db.select({ id: adminsTable.id })
    .from(adminsTable).where(eq(adminsTable.username, username.trim()));
  if (existing) return res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });

  const passwordHash = await hashPasswordBcrypt(password);
  const [created] = await db.insert(adminsTable).values({
    username: username.trim(),
    name: name.trim(),
    passwordHash,
    email: email?.trim() || null,
    role: role || "customer_service",
    permissions: permissions?.length ? JSON.stringify(permissions) : null,
    isActive: 1,
    createdBy: r.adminId,
  } as never).returning();

  return res.status(201).json({ id: created.id, message: "تم إنشاء الموظف بنجاح" });
});

// ── PUT /api/admin/employees/:id ─── update employee ─────────────────────────
router.put("/admin/employees/:id", requireAdmin, requireSectionPermission("employees"), requireManagerOrAdmin, async (req, res) => {
  const r = req as AdminRequest;
  const targetId = parseInt(String(req.params.id), 10);
  const { name, email, role, permissions, isActive, password } = req.body as {
    name?: string; email?: string; role?: string;
    permissions?: string[] | null; isActive?: number; password?: string;
  };

  const [target] = await db.select().from(adminsTable).where(eq(adminsTable.id, targetId));
  if (!target) return res.status(404).json({ error: "الموظف غير موجود" });

  // Managers can't edit admin accounts (unless it's their own profile)
  if (r.adminRole === "manager" && target.role === "admin" && target.id !== r.adminId) {
    return res.status(403).json({ error: "لا يمكنك تعديل بيانات مدير النظام" });
  }
  // Managers can't promote someone to admin
  if (r.adminRole === "manager" && role === "admin") {
    return res.status(403).json({ error: "لا يمكنك تعيين دور مدير النظام" });
  }
  const roleError = role !== undefined ? validateRoleAndPermissions(role, permissions) : validateRoleAndPermissions(target.role, permissions);
  if (roleError) return res.status(422).json({ error: roleError });
  // Can't deactivate yourself
  if (target.id === r.adminId && isActive === 0) {
    return res.status(400).json({ error: "لا يمكنك إيقاف حسابك بنفسك" });
  }

  const updates: Record<string, unknown> = {};
  if (name?.trim())      updates.name     = name.trim();
  if (email !== undefined) updates.email  = email?.trim() || null;
  if (role)              updates.role     = role;
  if (permissions !== undefined) {
    updates.permissions = Array.isArray(permissions) && permissions.length
      ? JSON.stringify(permissions) : null;
  }
  if (isActive !== undefined && (isActive === 0 || isActive === 1)) updates.isActive = isActive;
  if (password?.trim() && password.length >= 6) {
    updates.password_hash = await hashPasswordBcrypt(password);
  }

  await db.update(adminsTable).set(updates as never).where(eq(adminsTable.id, targetId));
  return res.json({ message: "تم تحديث بيانات الموظف بنجاح" });
});

// ── DELETE /api/admin/employees/:id ─── delete employee ──────────────────────
router.delete("/admin/employees/:id", requireAdmin, requireSectionPermission("employees"), requireManagerOrAdmin, async (req, res) => {
  const r = req as AdminRequest;
  const targetId = parseInt(String(req.params.id), 10);

  if (targetId === r.adminId) {
    return res.status(400).json({ error: "لا يمكنك حذف حسابك الخاص" });
  }

  const [target] = await db.select({ id: adminsTable.id, role: adminsTable.role })
    .from(adminsTable).where(eq(adminsTable.id, targetId));
  if (!target) return res.status(404).json({ error: "الموظف غير موجود" });

  // Managers can't delete admin accounts
  if (r.adminRole === "manager" && target.role === "admin") {
    return res.status(403).json({ error: "لا يمكنك حذف حساب مدير النظام" });
  }

  // Ensure at least one admin remains
  if (target.role === "admin") {
    const admins = await db.select({ id: adminsTable.id })
      .from(adminsTable).where(eq(adminsTable.role, "admin"));
    if (admins.length <= 1) {
      return res.status(400).json({ error: "لا يمكن حذف آخر مدير للنظام" });
    }
  }

  await db.delete(adminsTable).where(eq(adminsTable.id, targetId));
  return res.json({ message: "تم حذف الموظف بنجاح" });
});

// ── GET /api/admin/employees/me/profile ─── read own profile ─────────────────
router.get("/admin/employees/me/profile", requireAdmin, async (req, res) => {
  const r = req as AdminRequest;
  const [me] = await db.select().from(adminsTable).where(eq(adminsTable.id, r.adminId));
  if (!me) return res.status(404).json({ error: "الحساب غير موجود" });
  return res.json({
    id: me.id,
    username: me.username,
    name: me.name,
    email: me.email ?? "",
    role: me.role,
    permissions: resolvePermissions(me.role, me.permissions ?? null),
  });
});

// ── PUT /api/admin/employees/me/profile ─── update own profile ───────────────
router.put("/admin/employees/me/profile", requireAdmin, async (req, res) => {
  const r = req as AdminRequest;
  const { name, email, currentPassword, newPassword } = req.body as {
    name?: string; email?: string; currentPassword?: string; newPassword?: string;
  };

  const [me] = await db.select().from(adminsTable).where(eq(adminsTable.id, r.adminId));
  if (!me) return res.status(404).json({ error: "الحساب غير موجود" });

  const updates: Record<string, unknown> = {};
  if (name?.trim()) updates.name = name.trim();
  if (email !== undefined) updates.email = email?.trim() || null;

  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
    if (newPassword.length < 6) return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });

    const valid = await bcrypt.compare(currentPassword, me.passwordHash);
    if (!valid) return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    updates.password_hash = await hashPasswordBcrypt(newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "لا توجد بيانات للتحديث" });
  }

  await db.update(adminsTable).set(updates as never).where(eq(adminsTable.id, r.adminId));
  return res.json({ message: "تم تحديث البيانات بنجاح" });
});

export default router;
