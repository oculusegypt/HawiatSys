import { Router } from "express";
import { db } from "@workspace/db";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { partnersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/partners", async (_req, res) => {
  const partners = await db.select().from(partnersTable).orderBy(asc(partnersTable.order));
  return res.json(partners);
});

router.post("/partners", requireAdmin, requireSectionPermission("partners"), async (req, res) => {
  const { name, logoUrl, websiteUrl, order, isActive } = req.body;
  const [partner] = await db.insert(partnersTable).values({
    name, logoUrl, websiteUrl, order: order ?? 0, isActive: isActive ?? true,
  }).returning();
  return res.status(201).json(partner);
});

router.patch("/partners/:id", requireAdmin, requireSectionPermission("partners"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { name, logoUrl, websiteUrl, order, isActive } = req.body;
  const [partner] = await db.update(partnersTable)
    .set({ name, logoUrl, websiteUrl, order, isActive })
    .where(eq(partnersTable.id, id))
    .returning();
  if (!partner) return res.status(404).json({ error: "Not found" });
  return res.json(partner);
});

router.delete("/partners/:id", requireAdmin, requireSectionPermission("partners"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(partnersTable).where(eq(partnersTable.id, id));
  return res.status(204).send();
});

export default router;
