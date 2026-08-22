import { Router } from "express";
import { db } from "@workspace/db";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { testimonialsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/testimonials", async (_req, res) => {
  const testimonials = await db.select().from(testimonialsTable).orderBy(desc(testimonialsTable.createdAt));
  return res.json(testimonials);
});

router.post("/testimonials", requireAdmin, requireSectionPermission("testimonials"), async (req, res) => {
  const { clientName, company, content, rating, avatarUrl, isActive } = req.body;
  const parsedRating = Number(rating);
  if (
    typeof clientName !== "string" ||
    !clientName.trim() ||
    typeof content !== "string" ||
    !content.trim() ||
    !Number.isInteger(parsedRating) ||
    parsedRating < 1 ||
    parsedRating > 5
  ) {
    return res.status(400).json({ error: "بيانات التقييم غير صحيحة" });
  }
  const [t] = await db.insert(testimonialsTable).values({
    clientName: clientName.trim(),
    company: typeof company === "string" ? company.trim() : "",
    content: content.trim(),
    rating: parsedRating,
    avatarUrl,
    isActive: isActive ?? true,
  }).returning();
  return res.status(201).json(t);
});

router.patch("/testimonials/:id", requireAdmin, requireSectionPermission("testimonials"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { clientName, company, content, rating, avatarUrl, isActive } = req.body;
  const [t] = await db.update(testimonialsTable)
    .set({ clientName, company, content, rating, avatarUrl, isActive })
    .where(eq(testimonialsTable.id, id))
    .returning();
  if (!t) return res.status(404).json({ error: "Not found" });
  return res.json(t);
});

router.delete("/testimonials/:id", requireAdmin, requireSectionPermission("testimonials"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(testimonialsTable).where(eq(testimonialsTable.id, id));
  return res.status(204).send();
});

export default router;
