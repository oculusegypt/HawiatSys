/**
 * Resolve the public origin used by generated SEO and deployment files.
 *
 * The configured site setting is the source of truth. Build-time SITE_URL is
 * an explicit override for a deliberate domain migration; there is no
 * production-domain fallback in code.
 */
const NON_PUBLIC_HOST = /(^|\.)(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;
const REPLIT_HOST = /(^|\.)replit\.(dev|app)$/i;

export function normalizePublicOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    if (!url.hostname || NON_PUBLIC_HOST.test(url.hostname) || REPLIT_HOST.test(url.hostname)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function resolvePublicOrigin({ settings = {}, env = process.env } = {}) {
  return normalizePublicOrigin(env.SITE_URL) || normalizePublicOrigin(settings.site_public_url);
}

export function requirePublicOrigin(options = {}) {
  const origin = resolvePublicOrigin(options);
  if (!origin) {
    throw new Error(
      "A valid public HTTPS origin is required. Set site_public_url in site_settings or SITE_URL for the build.",
    );
  }
  return origin;
}