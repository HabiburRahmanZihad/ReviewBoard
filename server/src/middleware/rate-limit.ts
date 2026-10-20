import { Request, Response, NextFunction } from "express";
import rateLimit, { ipKeyGenerator, Options, RateLimitInfo } from "express-rate-limit";
import { config } from "../config";

// Responds with a JSON message that tells the user how long to wait.
const limitReached = (message: string) => {
  return (req: Request, res: Response, _next: NextFunction, options: Options): void => {
    const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
    const msLeft = info?.resetTime ? info.resetTime.getTime() - Date.now() : options.windowMs;
    const minutes = Math.max(1, Math.ceil(msLeft / 60_000));
    res.status(options.statusCode).json({
      success: false,
      message: `${message} Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    });
  };
};

// ─── Global Limiter ─────────────────────────────────────────────────────────
// Safety net for every route, keyed by IP.

export const globalLimiter = rateLimit({
  ...config.rateLimit.global,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limitReached("Too many requests."),
});

// ─── Auth Limiter ───────────────────────────────────────────────────────────
// Slows down password guessing. Only failed attempts count, so a classroom of
// students behind one IP can still all log in successfully.

export const authLimiter = rateLimit({
  ...config.rateLimit.auth,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limitReached("Too many failed attempts."),
});

// ─── Submission Limiter ─────────────────────────────────────────────────────
// Anti-spam for creating/resubmitting projects. Keyed by the authenticated user
// (not IP) so students sharing a network don't block each other, and only
// successful submissions count — fixing a validation error never locks you out.
// Must be mounted after `authenticate`.

export const submissionLimiter = rateLimit({
  ...config.rateLimit.submission,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
  skipFailedRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limitReached("You're submitting too quickly."),
});
