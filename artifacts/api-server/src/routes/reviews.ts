import { Router } from "express";
import { db, reviewsTable, servicesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";

const router = Router();

// Public: Get approved reviews and stats for a specific service
router.get("/services/:serviceId/reviews", async (req, res) => {
  const serviceId = parseInt(String(req.params.serviceId), 10);
  if (isNaN(serviceId)) {
    return res.status(400).json({ error: "معرّف الخدمة غير صالح" });
  }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.serviceId, serviceId), eq(reviewsTable.status, "approved")))
    .orderBy(desc(reviewsTable.createdAt));

  const count = reviews.length;
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    breakdown[star as 1 | 2 | 3 | 4 | 5]++;
    sum += r.rating;
  }

  const averageRating = count > 0 ? Number((sum / count).toFixed(1)) : 5.0;

  return res.json({
    serviceId,
    averageRating,
    reviewCount: count,
    breakdown,
    reviews,
  });
});

// Public: Submit a new review for a service (Status defaults to 'pending')
router.post("/services/:serviceId/reviews", async (req, res) => {
  const serviceId = parseInt(String(req.params.serviceId), 10);
  const { customerName, customerCity, rating, comment } = req.body;
  const parsedRating = Number(rating);

  if (
    isNaN(serviceId) ||
    typeof customerName !== "string" ||
    !customerName.trim() ||
    typeof comment !== "string" ||
    !comment.trim() ||
    !Number.isInteger(parsedRating) ||
    parsedRating < 1 ||
    parsedRating > 5
  ) {
    return res.status(400).json({ error: "يرجى إدخال جميع بيانات التقييم بشكل صحيح (الاسم، التقييم من 1 إلى 5، ونص التعليق)" });
  }

  const [newReview] = await db
    .insert(reviewsTable)
    .values({
      serviceId,
      customerName: customerName.trim(),
      customerCity: typeof customerCity === "string" && customerCity.trim() ? customerCity.trim() : "الرياض",
      rating: parsedRating,
      comment: comment.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    })
    .returning();

  return res.status(201).json({
    message: "تم استلام تقييمك بنجاح! سيتم مراجعته ونشره بعد التحقق.",
    review: newReview,
  });
});

// Admin: Get all reviews (with optional status / service filters)
router.get("/admin/reviews", requireAdmin, requireSectionPermission("reviews"), async (req, res) => {
  const { status, serviceId, search } = req.query;

  let query = db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  const allReviews = await query;

  let filtered = allReviews;

  if (status && typeof status === "string" && status !== "all") {
    filtered = filtered.filter((r) => r.status === status);
  }

  if (serviceId && typeof serviceId === "string" && serviceId !== "all") {
    const sId = parseInt(serviceId);
    filtered = filtered.filter((r) => r.serviceId === sId);
  }

  if (search && typeof search === "string" && search.trim()) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.customerName.toLowerCase().includes(s) ||
        r.comment.toLowerCase().includes(s) ||
        (r.customerCity && r.customerCity.toLowerCase().includes(s))
    );
  }

  return res.json(filtered);
});

// Admin: Update review status (approve, reject) or edit review content
router.patch("/admin/reviews/:id", requireAdmin, requireSectionPermission("reviews"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { status, customerName, customerCity, rating, comment } = req.body;

  const updateData: Partial<typeof reviewsTable.$inferInsert> = {};

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    updateData.status = status;
    if (status === "approved") {
      updateData.approvedAt = new Date().toISOString();
    }
  }

  if (customerName !== undefined && typeof customerName === "string" && customerName.trim()) updateData.customerName = customerName.trim();
  if (customerCity !== undefined && typeof customerCity === "string") updateData.customerCity = customerCity.trim() || "الرياض";
  if (rating !== undefined && Number.isInteger(Number(rating)) && Number(rating) >= 1 && Number(rating) <= 5) updateData.rating = Number(rating);
  if (comment !== undefined && typeof comment === "string" && comment.trim()) updateData.comment = comment.trim();

  const [updated] = await db
    .update(reviewsTable)
    .set(updateData)
    .where(eq(reviewsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "التقييم غير موجود" });
  return res.json(updated);
});

// Admin: Delete a review
router.delete("/admin/reviews/:id", requireAdmin, requireSectionPermission("reviews"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  return res.status(204).send();
});

export default router;
