import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { createUserSchema, overrideStatusSchema, updateUserSchema } from "../../validation/schemas";
import { adminController } from "./admin.controller";

const router = Router();

// Every admin route: a valid token (AuthN) AND the ADMIN role (AuthZ)
router.use(authenticate, authorize(Role.ADMIN));

// GET /api/admin/overview — counts, 14-day chart, reviewer workload, queue and activity in one call
router.get("/overview", adminController.getOverview);

// GET /api/admin/users — paginated, filter by role, search name/email
router.get("/users", adminController.listUsers);

// POST /api/admin/users — create an account with any role (how mentors get onboarded)
router.post("/users", validateBody(createUserSchema), adminController.createUser);

// PATCH /api/admin/users/:id — rename, change role, or reset password
router.patch("/users/:id", validateBody(updateUserSchema), adminController.updateUser);

// DELETE /api/admin/users/:id
router.delete("/users/:id", adminController.deleteUser);

// PATCH /api/admin/submissions/:id/status — set any status, e.g. reopen a decision made in error
router.patch("/submissions/:id/status", validateBody(overrideStatusSchema), adminController.overrideSubmissionStatus);

// DELETE /api/admin/submissions/:id — also removes its feedback (cascade)
router.delete("/submissions/:id", adminController.deleteSubmission);

// GET /api/admin/feedback — every comment on the platform, newest first
router.get("/feedback", adminController.listFeedback);

// DELETE /api/admin/feedback/:id — moderation
router.delete("/feedback/:id", adminController.deleteFeedback);

export default router;
