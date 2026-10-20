import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Never sign tokens with a guessable secret in production
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production.");
}

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
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
