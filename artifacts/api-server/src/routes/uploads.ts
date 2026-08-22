import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAdmin, requireDriver } from "../middleware/adminAuth";

const router = Router();

// ── Storage directory ──────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer config ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("نوع الملف غير مسموح به — يُقبل JPEG/PNG/WebP/GIF/AVIF فقط"));
  },
});

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace("Bearer ", "") || "";
  if (!token) { res.status(401).json({ error: "غير مصرح" }); return; }
  next();
}

// ── POST /api/admin/uploads ────────────────────────────────────────────────────
router.post("/admin/uploads", requireToken, upload.single("file"), (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: "لم يُرفَق ملف" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size });
});

// Driver completion evidence uses a dedicated protected route because the
// global /api/admin middleware intentionally blocks driver accounts.
router.post("/driver/uploads", requireAdmin, requireDriver, upload.single("file"), (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: "لم يُرفَق ملف" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size });
});

// Public conversation attachments. Files are still limited to safe image types
// and are stored in the same deployment-aware uploads directory used by the
// existing Hostinger build.
router.post("/uploads", upload.single("file"), (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: "لم يُرفَق ملف" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size });
});

// ── DELETE /api/admin/uploads/:filename ───────────────────────────────────────
router.delete("/admin/uploads/:filename", requireToken, (req: Request, res: Response): void => {
  const filename = path.basename(String(req.params["filename"] ?? "")); // prevent path traversal
  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "الملف غير موجود" });
  }
});

export default router;
