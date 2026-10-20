import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { HttpError, isUniqueViolation } from "../lib/http-error";
import { validateBody } from "../middleware/validate";
import { authLimiter } from "../middleware/rate-limit";
import { authenticate, JwtPayload } from "../middleware/auth";
import { loginSchema, signupSchema } from "../validation/schemas";

const router = Router();

const BCRYPT_COST = 12;

// Compared against when the email doesn't exist, so a login attempt takes the
// same time whether or not the account exists (prevents user enumeration).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_COST);

const signToken = (user: Pick<User, "id" | "role">): string => {
  const payload: JwtPayload = { userId: user.id, role: user.role };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

const publicUser = { id: true, name: true, email: true, role: true, createdAt: true } as const;

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
// Register a new student account.
// Mentors/admins are seeded directly into the database (as per requirements),
// so this endpoint can never create a privileged user — role is not accepted.

router.post("/signup", authLimiter, validateBody(signupSchema), async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new HttpError(409, "An account with this email already exists.", {
      email: "An account with this email already exists.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

  let user;
  try {
    // Role defaults to STUDENT in the schema
    user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: publicUser,
    });
  } catch (error) {
    // Two signups with the same email raced past the check above
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "An account with this email already exists.", {
        email: "An account with this email already exists.",
      });
    }
    throw error;
  }

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    data: { user, token: signToken(user) },
  });
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
// Authenticate any user (Student, Mentor, Admin) and return a JWT.

router.post("/login", authLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  // Same message for "no such user" and "wrong password"
  if (!user || !isPasswordValid) {
    throw new HttpError(401, "Invalid email or password.");
  }

  res.json({
    success: true,
    message: "Login successful.",
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: signToken(user),
    },
  });
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
// Get the currently authenticated user's profile.

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: publicUser,
  });

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  res.json({ success: true, data: { user } });
});

export default router;
