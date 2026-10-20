import express from "express";
import cors from "cors";
import { config } from "./config";
import { globalLimiter } from "./middleware/rate-limit";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import submissionRoutes from "./routes/submissions";
import adminRoutes from "./routes/admin";

const app = express();

// Behind a reverse proxy (Render, Railway, Nginx…) the client IP arrives in
// X-Forwarded-For; trust one hop so rate limits apply per user, not per proxy.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// ─── Global Middleware ──────────────────────────────────────────────────────

// CORS — allow requests from the Next.js frontend
app.use(
  cors({
    origin: config.clientUrl,
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

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "ReviewBoard API is running.",
    timestamp: new Date().toISOString(),
  });
});

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

app.listen(config.port, () => {
  console.log(`\n🚀 ReviewBoard API server running on http://localhost:${config.port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Client URL:  ${config.clientUrl}\n`);
});

export default app;
