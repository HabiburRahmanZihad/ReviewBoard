import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { validate, submissionValidation, feedbackValidation } from "../middleware/validate";
import { SubmissionStatus, Role, Prisma } from "@prisma/client";

const router = Router();

// All submission routes require authentication
router.use(authenticate);

// ─── POST /api/submissions ──────────────────────────────────────────────────
// Create a new project submission (Student only).
// Prevents duplicate submissions via unique constraint on [studentId, repoUrl].

router.post(
  "/",
  authorize(Role.STUDENT),
  validate(submissionValidation),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectName, repoUrl, liveUrl, description } = req.body;
      const studentId = req.user!.id;

      // Check for duplicate submission (same student + same repo URL)
      const existingSubmission = await prisma.submission.findFirst({
        where: {
          studentId,
          repoUrl: repoUrl.trim(),
        },
      });

      if (existingSubmission) {
        res.status(409).json({
          success: false,
          message: "You have already submitted a project with this repository URL.",
        });
        return;
      }

      const submission = await prisma.submission.create({
        data: {
          projectName: projectName.trim(),
          repoUrl: repoUrl.trim(),
          liveUrl: liveUrl?.trim() || null,
          description: description.trim(),
          studentId,
        },
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Submission created successfully.",
        data: { submission },
      });
    } catch (error: any) {
      // Handle Prisma unique constraint violation (P2002)
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
        error?.code === "P2002"
      ) {
        res.status(409).json({
          success: false,
          message: "You have already submitted a project with this repository URL.",
        });
        return;
      }
      console.error("Create submission error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating the submission.",
      });
    }
  }
);

// ─── GET /api/submissions ───────────────────────────────────────────────────
// Get submissions with server-side filtering and pagination.
// Students see only their own submissions.
// Mentors see all submissions with optional status filter.

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = "1", limit = "10", search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause based on role and filters
    const where: Prisma.SubmissionWhereInput = {};

    // Students can only see their own submissions
    if (req.user!.role === Role.STUDENT) {
      where.studentId = req.user!.id;
    }

    // Server-side status filter
    if (status && Object.values(SubmissionStatus).includes(status as SubmissionStatus)) {
      where.status = status as SubmissionStatus;
    }

    // Optional search by project name
    if (search && typeof search === "string") {
      where.projectName = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Execute paginated query with total count (parallel queries for performance)
    const [submissions, totalCount] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          reviewer: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { feedbacks: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasMore: skip + limitNum < totalCount,
        },
      },
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching submissions.",
    });
  }
});

// ─── GET /api/submissions/stats ─────────────────────────────────────────────
// Get aggregated statistics (Mentor only).

router.get(
  "/stats",
  authorize(Role.MENTOR),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      // Use groupBy for efficient aggregation in a single query
      const statusCounts = await prisma.submission.groupBy({
        by: ["status"],
        _count: { _all: true },
      });

      const totalStudents = await prisma.user.count({
        where: { role: Role.STUDENT },
      });

      // Transform into a more usable format
      const stats = {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalSubmissions: 0,
        totalStudents,
      };

      for (const group of statusCounts) {
        const count = group._count._all;
        stats.totalSubmissions += count;

        switch (group.status) {
          case SubmissionStatus.PENDING:
            stats.totalPending = count;
            break;
          case SubmissionStatus.APPROVED:
            stats.totalApproved = count;
            break;
          case SubmissionStatus.REJECTED:
            stats.totalRejected = count;
            break;
        }
      }

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching statistics.",
      });
    }
  }
);

// ─── GET /api/submissions/:id ───────────────────────────────────────────────
// Get a single submission with its feedback.

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
        feedbacks: {
          include: {
            mentor: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!submission) {
      res.status(404).json({
        success: false,
        message: "Submission not found.",
      });
      return;
    }

    // Students can only view their own submissions
    if (req.user!.role === Role.STUDENT && submission.studentId !== req.user!.id) {
      res.status(403).json({
        success: false,
        message: "You can only view your own submissions.",
      });
      return;
    }

    res.json({
      success: true,
      data: { submission },
    });
  } catch (error) {
    console.error("Get submission error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the submission.",
    });
  }
});

// ─── PATCH /api/submissions/:id/status ──────────────────────────────────────
// Approve or reject a submission (Mentor only).
// Updates the status and records the reviewer.

router.patch(
  "/:id/status",
  authorize(Role.MENTOR),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Ensure only users with the MENTOR role can approve/reject submissions
      if (req.user?.role !== Role.MENTOR) {
        res.status(403).json({
          success: false,
          message: "Access denied. Only users with the MENTOR role can approve or reject submissions.",
        });
        return;
      }

      const id = req.params.id as string;
      const { status } = req.body;

      // Validate status value
      if (!status || ![SubmissionStatus.APPROVED, SubmissionStatus.REJECTED].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Status must be either APPROVED or REJECTED.",
        });
        return;
      }

      // Verify submission exists
      const submission = await prisma.submission.findUnique({
        where: { id },
      });

      if (!submission) {
        res.status(404).json({
          success: false,
          message: "Submission not found.",
        });
        return;
      }

      // Update status and assign reviewer
      const updated = await prisma.submission.update({
        where: { id },
        data: {
          status,
          reviewerId: req.user!.id,
        },
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.json({
        success: true,
        message: `Submission ${status.toLowerCase()} successfully.`,
        data: { submission: updated },
      });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating the submission status.",
      });
    }
  }
);

// ─── POST /api/submissions/:id/feedback ─────────────────────────────────────
// Add feedback to a submission (Mentor only).

router.post(
  "/:id/feedback",
  authorize(Role.MENTOR),
  validate(feedbackValidation),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Ensure only users with the MENTOR role can create feedback
      if (req.user?.role !== Role.MENTOR) {
        res.status(403).json({
          success: false,
          message: "Access denied. Only users with the MENTOR role can create feedback.",
        });
        return;
      }

      const id = req.params.id as string;
      const { comment } = req.body;

      // Verify submission exists
      const submission = await prisma.submission.findUnique({
        where: { id },
      });

      if (!submission) {
        res.status(404).json({
          success: false,
          message: "Submission not found.",
        });
        return;
      }

      const feedback = await prisma.feedback.create({
        data: {
          comment: comment.trim(),
          submissionId: id,
          mentorId: req.user!.id,
        },
        include: {
          mentor: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Feedback added successfully.",
        data: { feedback },
      });
    } catch (error) {
      console.error("Add feedback error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while adding feedback.",
      });
    }
  }
);

export default router;
