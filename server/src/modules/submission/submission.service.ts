import { Prisma, Role, SubmissionStatus, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError, isUniqueViolation } from "../../lib/http-error";
import { listInclude, userSummary } from "../../lib/selects";
import { isReviewer } from "../../middleware/auth";
import { ListSubmissionsQuery, ReviewInput, SubmissionInput } from "../../validation/schemas";

// The signed-in user a read is scoped to
type Viewer = Pick<User, "id" | "role">;

const duplicateError = (existingStatus?: SubmissionStatus): HttpError => {
  const message =
    existingStatus === SubmissionStatus.REJECTED
      ? "You already submitted this repository and it was rejected. Use “Resubmit” on that submission instead."
      : "You have already submitted this repository.";
  return new HttpError(409, message, { repoUrl: message });
};

// ─── Create ─────────────────────────────────────────────────────────────────
// Duplicates are blocked per student on the *canonical* repo URL — the schema
// lowercases and strips ".git", trailing slashes, etc. before we get here —
// and enforced by the @@unique([studentId, repoUrl]) constraint as a backstop.

const createSubmission = async (studentId: string, data: SubmissionInput) => {
  const existing = await prisma.submission.findUnique({
    where: { studentId_repoUrl: { studentId, repoUrl: data.repoUrl } },
    select: { status: true },
  });
  if (existing) throw duplicateError(existing.status);

  try {
    return await prisma.submission.create({
      data: { ...data, studentId },
      include: listInclude,
    });
  } catch (error) {
    // A double-click raced past the check above; the DB constraint caught it
    if (isUniqueViolation(error)) throw duplicateError();
    throw error;
  }
};

// ─── Resubmit ───────────────────────────────────────────────────────────────
// A REJECTED submission goes back to PENDING with updated details (owner only).
// Earlier feedback is kept as history.

const resubmitSubmission = async (id: string, studentId: string, data: SubmissionInput) => {
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

  return prisma.submission.findUniqueOrThrow({ where: { id }, include: listInclude });
};

// ─── List ───────────────────────────────────────────────────────────────────
// Paginated list with server-side filtering.
// Students see only their own submissions; reviewers see everyone's.

const listSubmissions = async (viewer: Viewer, { page, limit, status, search }: ListSubmissionsQuery) => {
  const reviewer = isReviewer(viewer.role);

  const where: Prisma.SubmissionWhereInput = {};

  if (!reviewer) {
    where.studentId = viewer.id;
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

  return {
    submissions,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      hasMore: page * limit < totalCount,
    },
  };
};

// ─── Stats ──────────────────────────────────────────────────────────────────
// Aggregated counts by status. One GROUP BY query does the counting in the
// database instead of loading rows into memory. Scoped like the list:
// reviewers get platform-wide numbers, students get counts for their own work.

const getSubmissionStats = async (viewer: Viewer) => {
  const reviewer = isReviewer(viewer.role);
  const where: Prisma.SubmissionWhereInput = reviewer ? {} : { studentId: viewer.id };

  const [statusCounts, totalStudents] = await Promise.all([
    prisma.submission.groupBy({ by: ["status"], where, _count: { _all: true } }),
    reviewer ? prisma.user.count({ where: { role: Role.STUDENT } }) : Promise.resolve(1),
  ]);

  const countFor = (status: SubmissionStatus) =>
    statusCounts.find((group) => group.status === status)?._count._all ?? 0;

  return {
    totalPending: countFor(SubmissionStatus.PENDING),
    totalApproved: countFor(SubmissionStatus.APPROVED),
    totalRejected: countFor(SubmissionStatus.REJECTED),
    totalSubmissions: statusCounts.reduce((sum, group) => sum + group._count._all, 0),
    totalStudents,
  };
};

// ─── Get One ────────────────────────────────────────────────────────────────
// A single submission with its full feedback history.

const getSubmission = async (id: string, viewer: Viewer) => {
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
  if (!isReviewer(viewer.role) && submission.studentId !== viewer.id) {
    throw new HttpError(403, "You can only view your own submissions.");
  }

  return submission;
};

// ─── Review ─────────────────────────────────────────────────────────────────
// Approve or reject a PENDING submission.
// Rejecting requires a comment, which is saved as feedback in the same transaction.

const reviewSubmission = async (id: string, reviewerId: string, { status, comment }: ReviewInput) => {
  return prisma.$transaction(
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
};

// ─── Add Feedback ───────────────────────────────────────────────────────────
// A comment on any submission, whatever its status.

const addFeedback = async (submissionId: string, mentorId: string, comment: string) => {
  const exists = await prisma.submission.findUnique({ where: { id: submissionId }, select: { id: true } });
  if (!exists) {
    throw new HttpError(404, "Submission not found.");
  }

  return prisma.feedback.create({
    data: { comment, submissionId, mentorId },
    include: { mentor: userSummary },
  });
};

export const submissionService = {
  createSubmission,
  resubmitSubmission,
  listSubmissions,
  getSubmissionStats,
  getSubmission,
  reviewSubmission,
  addFeedback,
};
