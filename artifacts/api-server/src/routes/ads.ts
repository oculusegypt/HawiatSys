import { Router } from "express";
import { db } from "@workspace/db";
import { adsTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────

// GET /api/ads?position=after_hero  → active ads for that position
router.get("/ads", async (req, res) => {
  try {
    const position = req.query.position as string | undefined;
    const rows = position
      ? await db.select().from(adsTable).where(and(eq(adsTable.isActive, true), eq(adsTable.position, position))).orderBy(asc(adsTable.order))
      : await db.select().from(adsTable).where(eq(adsTable.isActive, true)).orderBy(asc(adsTable.order));
    return res.json(rows);
  } catch {
    return res.json([]);
  }
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/admin/ads → all ads (admin)
router.get("/admin/ads", requireAdmin, requireSectionPermission("ads"), async (_req, res) => {
  try {
    const rows = await db.select().from(adsTable).orderBy(asc(adsTable.order));
    return res.json(rows);
  } catch {
    return res.json([]);
  }
});

// POST /api/admin/ads → create
router.post("/admin/ads", requireAdmin, requireSectionPermission("ads"), async (req, res) => {
  try {
    const { title, content, imageUrl, linkUrl, buttonText, position, type, bgColor, isActive, order } = req.body;
    const [row] = await db.insert(adsTable).values({
      title: title || "إعلان جديد",
      content: content || "",
      imageUrl: imageUrl || "",
      linkUrl: linkUrl || "",
      buttonText: buttonText || "",
      position: position || "middle",
      type: type || "banner",
      bgColor: bgColor || "#eff6ff",
      isActive: isActive ?? true,
      order: order ?? 0,
    }).returning();
    return res.status(201).json(row);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// PATCH /api/admin/ads/:id → update
router.patch("/admin/ads/:id", requireAdmin, requireSectionPermission("ads"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { title, content, imageUrl, linkUrl, buttonText, position, type, bgColor, isActive, order } = req.body;
    const [row] = await db.update(adsTable).set({
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(linkUrl !== undefined && { linkUrl }),
      ...(buttonText !== undefined && { buttonText }),
      ...(position !== undefined && { position }),
      ...(type !== undefined && { type }),
      ...(bgColor !== undefined && { bgColor }),
      ...(isActive !== undefined && { isActive }),
      ...(order !== undefined && { order }),
    }).where(eq(adsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/admin/ads/:id
router.delete("/admin/ads/:id", requireAdmin, requireSectionPermission("ads"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(adsTable).where(eq(adsTable.id, id));
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
