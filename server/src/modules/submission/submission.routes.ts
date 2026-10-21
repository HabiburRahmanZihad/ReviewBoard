import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize, REVIEWER_ROLES } from "../../middleware/auth";
import { submissionLimiter } from "../../middleware/rate-limit";
import { validateBody } from "../../middleware/validate";
import { feedbackSchema, reviewSchema, submissionSchema } from "../../validation/schemas";
import { submissionController } from "./submission.controller";

const router = Router();

// All submission routes require authentication
router.use(authenticate);

// POST /api/submissions — create a new project submission (students only)
router.post(
  "/",
  authorize(Role.STUDENT),
  submissionLimiter,
  validateBody(submissionSchema),
  submissionController.createSubmission
);

// PUT /api/submissions/:id — resubmit a REJECTED submission (owner only)
router.put(
  "/:id",
  authorize(Role.STUDENT),
  submissionLimiter,
  validateBody(submissionSchema),
  submissionController.resubmitSubmission
);

// GET /api/submissions — paginated list; students get their own, reviewers get everyone's
router.get("/", submissionController.listSubmissions);

// GET /api/submissions/stats — counts by status (registered before /:id so "stats" isn't read as an id)
router.get("/stats", submissionController.getSubmissionStats);

// GET /api/submissions/:id — one submission with its full feedback history
router.get("/:id", submissionController.getSubmission);

// PATCH /api/submissions/:id/status — approve or reject a PENDING submission (reviewers only)
router.patch(
  "/:id/status",
  authorize(...REVIEWER_ROLES),
  validateBody(reviewSchema),
  submissionController.reviewSubmission
);

// POST /api/submissions/:id/feedback — comment on any submission (reviewers only)
router.post(
  "/:id/feedback",
  authorize(...REVIEWER_ROLES),
  validateBody(feedbackSchema),
  submissionController.addFeedback
);

export default router;
