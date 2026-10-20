import { Prisma } from "@prisma/client";

/**
 * An error that carries an HTTP status code. Throw it from any route handler —
 * Express 5 forwards it (sync or async) to the global error handler, which
 * turns it into a consistent `{ success: false, message }` JSON response.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string>
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** True when Prisma rejected a write because of a unique constraint (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
