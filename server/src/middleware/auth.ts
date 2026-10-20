import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { Role } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: Role;
}

// Roles allowed to review submissions. The seeded ADMIN can do everything a MENTOR can.
export const REVIEWER_ROLES: Role[] = [Role.MENTOR, Role.ADMIN];

export const isReviewer = (role: Role): boolean => REVIEWER_ROLES.includes(role);

// Extend Express Request to include authenticated user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        email: string;
        name: string;
      };
    }
  }
}

// ─── Authentication Middleware ───────────────────────────────────────────────
// Verifies the JWT token and attaches user data to the request object.
// This handles Authentication (AuthN) — "Who are you?"

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();

    // Verify token signature and expiry (pin the algorithm we sign with)
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] }) as JwtPayload;

    // Fetch the full user from the database to ensure they still exist
    // and their role hasn't changed since token issuance
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, email: true, name: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
      });
      return;
    }

    // Attach user to request for downstream route handlers
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

// ─── Authorization Middleware ────────────────────────────────────────────────
// Checks if the authenticated user has the required role(s).
// This handles Authorization (AuthZ) — "What are you allowed to do?"
// Must be used AFTER the `authenticate` middleware.

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required before authorization.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "You don't have permission to perform this action.",
      });
      return;
    }

    next();
  };
};
