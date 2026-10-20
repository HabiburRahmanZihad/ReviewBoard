import { Router, Request, Response } from "express";
import { SubmissionStatus, Role, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError, isUniqueViolation } from "../lib/http-error";
import { listInclude, userSummary } from "../lib/selects";
import { authenticate, authorize, isReviewer, REVIEWER_ROLES } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { submissionLimiter } from "../middleware/rate-limit";
import {
  feedbackSchema,
  listSubmissionsQuerySchema,
  reviewSchema,
  submissionSchema,
  SubmissionInput,
} from "../validation/schemas";

const router = Router();

// All submission routes require authentication
router.use(authenticate);

const duplicateError = (existingStatus?: SubmissionStatus): HttpError => {
  const message =
    existingStatus === SubmissionStatus.REJECTED
      ? "You already submitted this repository and it was rejected. Use “Resubmit” on that submission instead."
      : "You have already submitted this repository.";
  return new HttpError(409, message, { repoUrl: message });
};

// ─── POST /api/submissions ──────────────────────────────────────────────────
// Create a new project submission (Student only).
// Duplicates are blocked per student on the *canonical* repo URL — the schema
// lowercases and strips ".git", trailing slashes, etc. before we get here —
// and enforced by the @@unique([studentId, repoUrl]) constraint as a backstop.

router.post(
  "/",
  authorize(Role.STUDENT),
  submissionLimiter,
  validateBody(submissionSchema),
  async (req: Request, res: Response) => {
    const data: SubmissionInput = req.body;
    const studentId = req.user!.id;

    const existing = await prisma.submission.findUnique({
      where: { studentId_repoUrl: { studentId, repoUrl: data.repoUrl } },
      select: { status: true },
    });
    if (existing) throw duplicateError(existing.status);

    try {
      const submission = await prisma.submission.create({
        data: { ...data, studentId },
        include: listInclude,
      });

      res.status(201).json({
        success: true,
        message: "Submission created successfully.",
        data: { submission },
      });
    } catch (error) {
      // A double-click raced past the check above; the DB constraint caught it
      if (isUniqueViolation(error)) throw duplicateError();
      throw error;
    }
  }
);

// ─── PUT /api/submissions/:id ───────────────────────────────────────────────
// Resubmit a REJECTED submission with updated details (owner only).
// The submission goes back to PENDING; earlier feedback is kept as history.

router.put(
  "/:id",
  authorize(Role.STUDENT),
  submissionLimiter,
  validateBody(submissionSchema),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const data: SubmissionInput = req.body;
    const studentId = req.user!.id;

    const existing = await prisma.submission.findUnique({
      where: { id },
      select: { studentId: true, status: true },
    });
    if (!existing) throw new HttpError(404, "Submission not found.");
    if (existing.studentId !== studentId) {
      throw new HttpError(403, "You can only resubmit your own submissions.");
    }

    try {
      // Conditional update: only succeeds while the submission is still REJECTED,
      // so a double-click can't resubmit twice.
      const { count } = await prisma.submission.updateMany({
        where: { id, studentId, status: SubmissionStatus.REJECTED },
        data: { ...data, status: SubmissionStatus.PENDING, reviewerId: null },
      });
      if (count === 0) {
        throw new HttpError(409, "Only rejected submissions can be resubmitted.");
      }
    } catch (error) {
      // The new repo URL matches another of this student's submissions
      if (isUniqueViolation(error)) throw duplicateError();
      throw error;
    }

    const submission = await prisma.submission.findUniqueOrThrow({ where: { id }, include: listInclude });

    res.json({
      success: true,
      message: "Submission resubmitted for review.",
      data: { submission },
    });
  }
);

// ─── GET /api/submissions ───────────────────────────────────────────────────
// Paginated list with server-side filtering.
// Students see only their own submissions; reviewers see everyone's.

router.get("/", async (req: Request, res: Response) => {
  const { page, limit, status, search } = listSubmissionsQuerySchema.parse(req.query);
  const reviewer = isReviewer(req.user!.role);

  const where: Prisma.SubmissionWhereInput = {};

  if (!reviewer) {
    where.studentId = req.user!.id;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    const contains = { contains: search, mode: "insensitive" } as const;
    where.OR = [
      { projectName: contains },
      // Reviewers can also find submissions by student name or email
      ...(reviewer ? [{ student: { name: contains } }, { student: { email: contains } }] : []),
    ];
  }

  // Page of rows + total count in parallel
  const [submissions, totalCount] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: listInclude,
      // `id` breaks ties so rows never shuffle between pages
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.submission.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      submissions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        hasMore: page * limit < totalCount,
      },
    },
  });
});

// ─── GET /api/submissions/stats ─────────────────────────────────────────────
// Aggregated counts by status. One GROUP BY query does the counting in the
// database instead of loading rows into memory. Scoped like the list:
// reviewers get platform-wide numbers, students get counts for their own work.

router.get("/stats", async (req: Request, res: Response) => {
  const reviewer = isReviewer(req.user!.role);
  const where: Prisma.SubmissionWhereInput = reviewer ? {} : { studentId: req.user!.id };

  const [statusCounts, totalStudents] = await Promise.all([
    prisma.submission.groupBy({ by: ["status"], where, _count: { _all: true } }),
    reviewer ? prisma.user.count({ where: { role: Role.STUDENT } }) : Promise.resolve(1),
  ]);

  const countFor = (status: SubmissionStatus) =>
    statusCounts.find((group) => group.status === status)?._count._all ?? 0;

  const stats = {
    totalPending: countFor(SubmissionStatus.PENDING),
    totalApproved: countFor(SubmissionStatus.APPROVED),
    totalRejected: countFor(SubmissionStatus.REJECTED),
    totalSubmissions: statusCounts.reduce((sum, group) => sum + group._count._all, 0),
    totalStudents,
  };

  res.json({ success: true, data: { stats } });
});

// ─── GET /api/submissions/:id ───────────────────────────────────────────────
// A single submission with its full feedback history.

router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: userSummary,
      reviewer: userSummary,
      feedbacks: { include: { mentor: userSummary }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!submission) {
    throw new HttpError(404, "Submission not found.");
  }

  // Students can only view their own submissions
  if (!isReviewer(req.user!.role) && submission.studentId !== req.user!.id) {
    throw new HttpError(403, "You can only view your own submissions.");
  }

  res.json({ success: true, data: { submission } });
});

// ─── PATCH /api/submissions/:id/status ──────────────────────────────────────
// Approve or reject a PENDING submission (reviewers only).
// Rejecting requires a comment, which is saved as feedback in the same transaction.

router.patch(
  "/:id/status",
  authorize(...REVIEWER_ROLES),
  validateBody(reviewSchema),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status, comment } = req.body as { status: SubmissionStatus; comment?: string };
    const reviewerId = req.user!.id;

    const submission = await prisma.$transaction(
      async (tx) => {
        // Atomic compare-and-set: only a PENDING submission can be reviewed. If two
        // mentors act at the same moment, exactly one update matches; the other gets 409
        // instead of silently overwriting the first decision.
        const { count } = await tx.submission.updateMany({
          where: { id, status: SubmissionStatus.PENDING },
          data: { status, reviewerId },
        });

        if (count === 0) {
          const current = await tx.submission.findUnique({
            where: { id },
            select: { status: true, reviewer: { select: { name: true } } },
          });
          if (!current) throw new HttpError(404, "Submission not found.");
          const by = current.reviewer ? ` by ${current.reviewer.name}` : "";
          throw new HttpError(409, `This submission was already ${current.status.toLowerCase()}${by}.`);
        }

        if (comment) {
          await tx.feedback.create({ data: { comment, submissionId: id, mentorId: reviewerId } });
        }

        return tx.submission.findUniqueOrThrow({ where: { id }, include: listInclude });
      },
      { timeout: 15_000 }
    );

    res.json({
      success: true,
      message: `Submission ${status.toLowerCase()} successfully.`,
      data: { submission },
    });
  }
);

// ─── POST /api/submissions/:id/feedback ─────────────────────────────────────
// Add a feedback comment to any submission (reviewers only).

router.post(
  "/:id/feedback",
  authorize(...REVIEWER_ROLES),
  validateBody(feedbackSchema),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { comment } = req.body;

    const exists = await prisma.submission.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new HttpError(404, "Submission not found.");
    }

    const feedback = await prisma.feedback.create({
      data: { comment, submissionId: id, mentorId: req.user!.id },
      include: { mentor: userSummary },
    });

    res.status(201).json({
      success: true,
      message: "Feedback added successfully.",
      data: { feedback },
    });
  }
);

export default router;
