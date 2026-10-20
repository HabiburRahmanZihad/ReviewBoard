import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// ─── Body Validation Middleware ─────────────────────────────────────────────
// Parses the request body with a Zod schema and replaces `req.body` with the
// parsed result — trimmed, normalised, and stripped of unknown fields — so route
// handlers only ever see clean data. A failed parse throws a ZodError, which the
// global error handler turns into a 400 response with per-field messages.

export const validateBody = (schema: z.ZodType) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
};

/** Flattens a ZodError into `{ field: firstMessage }` for the client to show inline. */
export function formatZodError(error: z.ZodError): { message: string; errors: Record<string, string> } {
  const { formErrors, fieldErrors } = z.flattenError(error);
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors) as [string, string[] | undefined][]) {
    if (messages?.[0]) errors[field] = messages[0];
  }
  return { message: formErrors[0] ?? "Validation failed.", errors };
}
