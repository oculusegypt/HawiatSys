import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { requireAdmin, requireDriver, requireSectionPermission } from "../middleware/adminAuth";

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

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 8 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtension = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(extension);
    if (ALLOWED_TYPES.has(file.mimetype) && allowedExtension) cb(null, true);
    else cb(new Error("نوع الملف غير مسموح به — يُقبل JPEG/PNG/WebP/GIF/AVIF فقط"));
  },
});

function hasImageSignature(filePath: string): boolean {
  const header = Buffer.alloc(32);
  const fd = fs.openSync(filePath, "r");
  try {
    const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
    const bytes = header.subarray(0, bytesRead);
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isGif = bytes.length >= 6 && (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a");
    const isWebp = bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    const isAvif = bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["avif", "avis", "mif1", "msf1"].includes(bytes.subarray(8, 12).toString("ascii"));
    return isJpeg || isPng || isGif || isWebp || isAvif;
  } finally {
    fs.closeSync(fd);
  }
}

function compressImage(filePath: string): { path: string; filename: string; size: number } {
  const optimizedPath = `${filePath}.tmp.webp`;
  try {
    execFileSync("magick", [
      filePath,
      "-auto-orient",
      "-resize", "2400x2400>",
      "-strip",
      "-quality", "86",
      optimizedPath,
    ], { stdio: "ignore", timeout: 30_000 });
    const optimized = fs.statSync(optimizedPath);
    if (!optimized.size) throw new Error("empty optimized image");
    fs.rmSync(filePath, { force: true });
    const filename = `${path.basename(filePath).replace(/\.[^.]+$/, "")}.webp`;
    const finalPath = path.join(path.dirname(filePath), filename);
    fs.renameSync(optimizedPath, finalPath);
    return { path: finalPath, filename, size: optimized.size };
  } catch {
    fs.rmSync(optimizedPath, { force: true });
    throw new Error("تعذر ضغط الصورة على الخادم");
  }
}

function safeUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (error: unknown) => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "حجم الملف أكبر من 8 ميغابايت"
        : error instanceof Error ? error.message : "تعذر رفع الملف";
      res.status(400).json({ error: message });
      return;
    }
    if (req.file && !hasImageSignature(req.file.path)) {
      fs.rmSync(req.file.path, { force: true });
      res.status(400).json({ error: "محتوى الملف لا يطابق نوع الصورة المعلن" });
      return;
    }
    if (req.file) {
      try {
        const optimized = compressImage(req.file.path);
        req.file.path = optimized.path;
        req.file.filename = optimized.filename;
        req.file.size = optimized.size;
        req.file.mimetype = "image/webp";
      } catch (error) {
        fs.rmSync(req.file.path, { force: true });
        res.status(422).json({ error: error instanceof Error ? error.message : "تعذر ضغط الصورة على الخادم" });
        return;
      }
    }
    next();
  });
}

function rejectUnsafeFileName(req: Request, res: Response, next: NextFunction): void {
  const originalName = req.file?.originalname ?? "";
  if (originalName.includes("\0") || originalName.split(".").length > 2) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    res.status(400).json({ error: "اسم الملف غير صالح" });
    return;
  }
  next();
}

// ── POST /api/admin/uploads ────────────────────────────────────────────────────
router.post("/admin/uploads", requireAdmin, requireSectionPermission("settings"), safeUpload, rejectUnsafeFileName, (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: "لم يُرفَق ملف" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size, contentType: req.file.mimetype });
});

router.post("/admin/slides/upload", requireAdmin, requireSectionPermission("slides"), safeUpload, rejectUnsafeFileName, (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: "لم يُرفَق ملف" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size, contentType: req.file.mimetype });
});

// Driver completion evidence uses a dedicated protected route because the
// global /api/admin middleware intentionally blocks driver accounts.
router.post("/driver/uploads", requireAdmin, requireDriver, safeUpload, rejectUnsafeFileName, (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: "لم يُرفَق ملف" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size, contentType: req.file.mimetype });
});

// Public conversation attachments. Files are still limited to safe image types
// and are stored in the same deployment-aware uploads directory used by the
// existing Hostinger build.
router.post("/uploads", safeUpload, rejectUnsafeFileName, (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: "لم يُرفَق ملف" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size, contentType: req.file.mimetype });
});

// ── DELETE /api/admin/uploads/:filename ───────────────────────────────────────
router.delete("/admin/uploads/:filename", requireAdmin, requireSectionPermission("settings"), (req: Request, res: Response): void => {
  const filename = path.basename(String(req.params["filename"] ?? "")); // prevent path traversal
  if (filename !== req.params["filename"] || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
    res.status(400).json({ error: "اسم الملف غير صالح" });
    return;
  }
  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "الملف غير موجود" });
  }
});

export default router;
