import { Router } from "express";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";
import { getSeoMetrics } from "../lib/seoMetrics";

const router = Router();

router.get(
  "/admin/seo/metrics",
  requireAdmin,
  requireSectionPermission("seo"),
  async (req, res) => {
    try {
      res.json(await getSeoMetrics());
    } catch (error) {
      req.log?.error({ error }, "Failed to calculate SEO metrics");
      res.status(500).json({ error: "تعذر حساب مؤشرات SEO من آخر ناتج إنتاج" });
    }
  },
);

export default router;