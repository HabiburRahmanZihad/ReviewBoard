import express from "express";
import cors from "cors";
import { config } from "./config";
import { prisma } from "./lib/prisma";
import { globalLimiter } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import submissionRoutes from "./routes/submissions";
import adminRoutes from "./routes/admin";

const app = express();

// Behind a reverse proxy (Render, Railway, Nginx…) the client IP arrives in
// X-Forwarded-For; trusting the proxy hop(s) makes rate limits apply per user, not per proxy.
if (config.trustProxy) {
  app.set("trust proxy", config.trustProxy);
}

// ─── Health Check ───────────────────────────────────────────────────────────
// Registered before CORS and rate limiting: the host pings it every few
// seconds, and a 429 here would make it think the service is down.

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "ReviewBoard API is running.",
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Middleware ──────────────────────────────────────────────────────

// CORS — allow requests from the frontend origin(s) only
app.use(
  cors({
    origin: config.clientUrls,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON request bodies — submissions are small, so keep the limit tight
app.use(express.json({ limit: "100kb" }));

// Global rate limiter (route-specific limiters live next to their routes)
app.use(globalLimiter);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  console.log(`\n🚀 ReviewBoard API listening on port ${config.port}`);
  console.log(`   Environment:     ${process.env.NODE_ENV || "development"}`);
  console.log(`   Allowed origins: ${config.clientUrls.join(", ")}`);
  console.log(`   Trust proxy:     ${config.trustProxy || "off"}\n`);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
// Hosts send SIGTERM before replacing an instance (every deploy on Render).
// Stop accepting connections, let in-flight requests finish, then close the DB pool.

let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully…`);

  server.close(async () => {
    await prisma.$disconnect();
    console.log("Server closed.");
    process.exit(0);
  });

  // Don't hang forever on a stuck connection
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
