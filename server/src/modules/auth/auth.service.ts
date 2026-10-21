import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { config } from "../../config";
import { HttpError, isUniqueViolation } from "../../lib/http-error";
import { JwtPayload } from "../../middleware/auth";
import { LoginInput, SignupInput } from "../../validation/schemas";

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

// ─── Signup ─────────────────────────────────────────────────────────────────
// Always creates a STUDENT account: role is not part of the input.

const signup = async ({ name, email, password }: SignupInput) => {
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

  return { user, token: signToken(user) };
};

// ─── Login ──────────────────────────────────────────────────────────────────
// Any role (Student, Mentor, Admin) — returns the user and a JWT.

const login = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  // Same message for "no such user" and "wrong password"
  if (!user || !isPasswordValid) {
    throw new HttpError(401, "Invalid email or password.");
  }

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token: signToken(user),
  };
};

// ─── Current User ───────────────────────────────────────────────────────────

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUser,
  });

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  return user;
};

export const authService = { signup, login, getMe };
