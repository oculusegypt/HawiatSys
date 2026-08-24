import { Router } from "express";
import multer from "multer";
import { Client } from "basic-ftp";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, mkdtemp, rm, writeFile } from "node:fs/promises";
import { mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { getSetting, setSetting } from "./settings";
import { requireAdmin, requireSectionPermission, type AdminRequest } from "../middleware/adminAuth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

const SETTINGS = {
  host: "hostinger_ftp_host",
  username: "hostinger_ftp_username",
  port: "hostinger_ftp_port",
  remotePath: "hostinger_ftp_remote_path",
  secure: "hostinger_ftp_secure",
  password: "hostinger_ftp_password",
} as const;

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return crypto.createHash("sha256").update(`hostinger-ftp:${secret}`).digest();
}

function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptPassword(value: string): string {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("بيانات كلمة مرور FTP المشفرة غير صالحة");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}

async function getDeploySettings() {
  const [host, username, port, remotePath, secure, password] = await Promise.all(
    Object.values(SETTINGS).map(getSetting),
  );
  let storedPassword = "";
  if (password) {
    try {
      storedPassword = decryptPassword(password);
    } catch {
      // Older installations may have encrypted the setting with a previous
      // SESSION_SECRET. Prefer the managed secret fallback so deployment can
      // repair the saved setting through the normal settings form.
      storedPassword = "";
    }
  }
  return {
    host: host.replace(/^ftps?:\/\//i, "").replace(/\/+$/, ""),
    username,
    port: Number(port) || 21,
    remotePath: `/${(remotePath || "public_html").replace(/^\/+|\/+$/g, "")}`,
    secure: secure === "true",
    // Replit keeps the fallback in its encrypted Secrets store. This avoids
    // putting a plaintext FTP credential in source, logs, or a new database
    // row, while still allowing one-click uploads when the saved setting is
    // empty or belongs to an older installation.
    password: storedPassword || process.env.HOSTINGER_FTP_PASSWORD || "",
  };
}

function safeArchiveEntries(zipPath: string): string[] {
  const output = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  const entries = output.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  for (const entry of entries) {
    const normalized = entry.replaceAll("\\", "/");
    if (normalized.startsWith("/") || normalized.includes("../") || normalized === ".." || normalized.includes("\0")) {
      throw new Error("ملف التحديث يحتوي على مسار غير آمن");
    }
  }
  return entries.filter(entry => !entry.endsWith("/"));
}

function extractedFiles(root: string, relativeDir = ""): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(root, relativeDir), { withFileTypes: true })) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...extractedFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error("ملف الباتش يحتوي على رابط أو عنصر غير صالح");
    }
  }
  return files;
}

router.use("/admin/hostinger", requireAdmin, requireSectionPermission("settings", { adminOnly: true }));

router.get("/admin/hostinger", async (_req, res) => {
  const [host, username, port, remotePath, secure, password] = await Promise.all(
    Object.values(SETTINGS).map(getSetting),
  );
  return res.json({
    host,
    username,
    port: port || "21",
    remotePath: remotePath || "public_html",
    secure: secure === "true",
    hasPassword: Boolean(password) || Boolean(process.env.HOSTINGER_FTP_PASSWORD),
  });
});

router.put("/admin/hostinger", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const host = String(body.host ?? "").trim().replace(/^ftps?:\/\//i, "").replace(/\/+$/, "");
  const username = String(body.username ?? "").trim();
  const port = Number(body.port ?? 21);
  const remotePath = String(body.remotePath ?? "public_html").trim().replace(/^\/+|\/+$/g, "");
  if (!host || !username || !Number.isInteger(port) || port < 1 || port > 65535 || !remotePath) {
    return res.status(400).json({ error: "يرجى إدخال بيانات FTP صحيحة" });
  }
  await setSetting(SETTINGS.host, host);
  await setSetting(SETTINGS.username, username);
  await setSetting(SETTINGS.port, String(port));
  await setSetting(SETTINGS.remotePath, remotePath);
  await setSetting(SETTINGS.secure, body.secure === true ? "true" : "false");
  const password = String(body.password ?? "");
  if (password) await setSetting(SETTINGS.password, encryptPassword(password));
  return res.json({ host, username, port: String(port), remotePath, secure: body.secure === true, hasPassword: Boolean(password) || Boolean(await getSetting(SETTINGS.password)) });
});

router.post("/admin/hostinger/test", async (req, res) => {
  let client: Client | undefined;
  try {
    const settings = await getDeploySettings();
    if (!settings.host || !settings.username || !settings.password) return res.status(400).json({ error: "بيانات FTP غير مكتملة" });
    client = new Client(20_000);
    await client.access({ host: settings.host, user: settings.username, password: settings.password, port: settings.port, secure: settings.secure });
    await client.cd(settings.remotePath);
    return res.json({ ok: true, path: settings.remotePath });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : "تعذر الاتصال بـ Hostinger" });
  } finally {
    client?.close();
  }
});

router.post("/admin/hostinger/deploy", upload.single("patch"), async (req: AdminRequest, res) => {
  let client: Client | undefined;
  let workDir = "";
  try {
    if (!req.file || !req.file.originalname.toLowerCase().endsWith(".zip")) {
      return res.status(400).json({ error: "اختر ملف Patch بصيغة ZIP" });
    }
    const settings = await getDeploySettings();
    if (!settings.host || !settings.username || !settings.password) return res.status(400).json({ error: "بيانات FTP غير مكتملة" });
    workDir = await mkdtemp(join(tmpdir(), "hostinger-patch-"));
    const zipPath = join(workDir, "patch.zip");
    await writeFile(zipPath, req.file.buffer);
    const entries = safeArchiveEntries(zipPath);
    if (!entries.length) return res.status(400).json({ error: "ملف الباتش فارغ" });
    const extractedRoot = join(workDir, "extracted");
    mkdirSync(extractedRoot, { recursive: true });
    execFileSync("unzip", ["-q", zipPath, "-d", extractedRoot]);
    const files = extractedFiles(extractedRoot);
    for (const entry of files) {
      const localPath = resolve(extractedRoot, entry);
      const stat = await lstat(localPath);
      if (!stat.isFile()) throw new Error("ملف الباتش يحتوي على رابط أو عنصر غير صالح");
    }
    client = new Client(30_000);
    await client.access({ host: settings.host, user: settings.username, password: settings.password, port: settings.port, secure: settings.secure });
    await client.uploadFromDir(extractedRoot, settings.remotePath);
    return res.json({ ok: true, uploaded: files.length, remotePath: settings.remotePath });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : "فشل رفع الباتش إلى Hostinger" });
  } finally {
    client?.close();
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
});

export default router;