/**
 * Add or refresh one safe demo account for every supported role.
 * Run with: pnpm --filter @workspace/db run seed:roles
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { adminsTable, type AdminRole } from "./schema/admins.js";

const password = "Demo@2026!";
const hash = (value: string) => crypto.createHash("sha256").update(value + "cleanflow-password-salt").digest("hex");
const accounts: { username: string; name: string; email: string; role: AdminRole }[] = [
  { username: "demo.manager", name: "مدير التجربة", email: "manager.demo@example.com", role: "manager" },
  { username: "demo.support", name: "موظف خدمة العملاء", email: "support.demo@example.com", role: "customer_service" },
  { username: "demo.requests", name: "مسؤول الطلبات", email: "requests.demo@example.com", role: "requests_officer" },
  { username: "demo.driver", name: "السائق التجريبي", email: "driver.demo@example.com", role: "driver" },
];

for (const account of accounts) {
  const existing = db.select({ id: adminsTable.id }).from(adminsTable).where(eq(adminsTable.username, account.username)).get();
  if (existing) {
    db.update(adminsTable).set({
      name: account.name, email: account.email, role: account.role,
      permissions: null, isActive: 1, passwordHash: hash(password),
    }).where(eq(adminsTable.id, existing.id)).run();
  } else {
    db.insert(adminsTable).values({
      ...account, passwordHash: hash(password), permissions: null, isActive: 1,
    }).run();
  }
}

console.log(JSON.stringify({
  password,
  accounts: accounts.map(({ username, name, role }) => ({ username, name, role })),
}, null, 2));