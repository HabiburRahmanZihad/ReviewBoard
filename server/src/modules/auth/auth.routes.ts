import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rate-limit";
import { validateBody } from "../../middleware/validate";
import { loginSchema, signupSchema } from "../../validation/schemas";
import { authController } from "./auth.controller";

const router = Router();

// POST /api/auth/signup — register a new student account.
// Mentors/admins are seeded directly into the database (as per requirements),
// so this endpoint can never create a privileged user — role is not accepted.
router.post("/signup", authLimiter, validateBody(signupSchema), authController.signup);

// POST /api/auth/login — authenticate any user (Student, Mentor, Admin) and return a JWT
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);

// GET /api/auth/me — the currently authenticated user's profile
router.get("/me", authenticate, authController.getMe);

export default router;
