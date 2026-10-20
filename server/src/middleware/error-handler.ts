import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError, isUniqueViolation } from "../lib/http-error";
import { formatZodError } from "./validate";

// ─── Global Error Handler ───────────────────────────────────────────────────
// Every error thrown in a route (Express 5 forwards async rejections too) ends
// up here and is mapped to one consistent JSON shape:
//   { success: false, message: string, errors?: { field: message } }

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
    return;
  }

  if (err instanceof ZodError) {
    const { message, errors } = formatZodError(err);
    res.status(400).json({ success: false, message, errors });
    return;
  }

  // Thrown by express.json() for malformed or oversized bodies
  const bodyError = err as { type?: string };
  if (bodyError?.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Request body is not valid JSON." });
    return;
  }
  if (bodyError?.type === "entity.too.large") {
    res.status(413).json({ success: false, message: "Request body is too large." });
    return;
  }

  if (isUniqueViolation(err)) {
    res.status(409).json({ success: false, message: "This record already exists." });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "An unexpected error occurred." });
};
