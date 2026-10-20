import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Never sign tokens with a guessable secret in production
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production.");
}

/**
 * Frontend origins allowed by CORS. Comma-separated, so one API can serve the
 * production site plus, say, a staging URL. Trailing slashes are stripped
 * because browsers send the Origin header without one.
 */
const clientUrls = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

/**
 * How many reverse proxies sit in front of the app (Render: 1). Express uses it
 * to read the real client IP from X-Forwarded-For, which rate limiting needs.
 * Accepts a hop count, or "true" for one hop.
 */
function parseTrustProxy(value: string | undefined): number | false {
  if (!value || value === "false" || value === "0") return false;
  if (value === "true") return 1;
  const hops = Number(value);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  clientUrls,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  isProduction,
  jwt: {
    secret: process.env.JWT_SECRET || "dev-only-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  rateLimit: {
    // Global safety net for every route, per IP
    global: { windowMs: 15 * 60 * 1000, max: 300 },
    // Failed login/signup attempts per IP (brute-force protection)
    auth: { windowMs: 15 * 60 * 1000, max: 20 },
    // Successful create/resubmit actions per student account (spam protection)
    submission: { windowMs: 15 * 60 * 1000, max: 5 },
  },
} as const;
