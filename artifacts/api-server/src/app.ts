import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAdmin, requireNonDriver } from "./middleware/adminAuth";

const app: Express = express();
// The deployed app runs behind a reverse proxy. Trust its hop so rate limiting
// and request IP detection use the forwarded client address without warnings.
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // The public chat can explicitly request a location and open the device
  // camera through the browser's file picker. Keep microphone disabled.
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(self), microphone=()");
  next();
});

// ── CORS — allow local development and Replit preview origins ────────────────
// Production deployments are same-origin, so their browser requests do not
// need a hard-coded company-domain allowlist.
const allowedOrigins = [
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /localhost/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https?:\/\/0\.0\.0\.0(?::\d+)?$/,
  /sabaik-almasa/,
];
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin / curl
      if (allowedOrigins.some((p) => (p instanceof RegExp ? p.test(origin) : origin === p))) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", loginLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// ── Serve uploaded files ──────────────────────────────────────────────────────
const uploadHeaders = (res: Response) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
};
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));
app.use("/api/uploads", express.static(path.join(process.cwd(), "artifacts/api-server/uploads"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));
app.use("/api/uploads", express.static(path.join(process.cwd(), "build_php/uploads"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));
app.use("/api/uploads", express.static(path.join(process.cwd(), "attached_assets"), { dotfiles: "deny", fallthrough: true, setHeaders: uploadHeaders }));

// ── Admin routes — require valid token globally ───────────────────────────────
app.use("/api/admin", requireAdmin, requireNonDriver);

// ── All routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Serve frontend SPA ────────────────────────────────────────────────────────
// The workflow may start this package with either the workspace root or the
// package directory as cwd. Resolve the frontend from the bundled server's
// location first, then keep the cwd-based path as a local-dev fallback.
const frontendDistCandidates = [
  path.resolve(__dirname, "../../../artifacts/sabaik-almasa/dist/public"),
  path.resolve(process.cwd(), "artifacts/sabaik-almasa/dist/public"),
];
const frontendDistPath =
  frontendDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) ??
  frontendDistCandidates[0];
app.use(express.static(frontendDistPath));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(frontendDistPath, "index.html"));
  }
  next();
});

export default app;
