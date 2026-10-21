import bcrypt from "bcryptjs";
import { Prisma, Role, SubmissionStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError, isUniqueViolation } from "../../lib/http-error";
import { adminUserSelect, listInclude, userSummary } from "../../lib/selects";
import { REVIEWER_ROLES } from "../../middleware/auth";
import {
  CreateUserInput,
  ListFeedbackQuery,
  ListUsersQuery,
  OverrideStatusInput,
  UpdateUserInput,
} from "../../validation/schemas";

const BCRYPT_COST = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;
const STALE_AFTER_DAYS = 3;

const pageInfo = (page: number, limit: number, totalCount: number) => ({
  page,
  limit,
  totalCount,
  totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  hasMore: page * limit < totalCount,
});

const emailTaken = () =>
  new HttpError(409, "An account with this email already exists.", {
    email: "An account with this email already exists.",
  });

// ─── Overview ───────────────────────────────────────────────────────────────
// Everything the admin home page needs, in one round trip: platform counts,
// a 14-day submission series, reviewer workload, the oldest waiting
// submissions and a recent-activity feed.

type Activity = {
  id: string;
  kind: "joined" | "submitted" | "approved" | "rejected" | "commented";
  at: Date;
  actor: string;
  subject?: string;
  submissionId?: string;
  role?: Role;
};

const getOverview = async (tz: string) => {
  const staleBefore = new Date(Date.now() - STALE_AFTER_DAYS * DAY_MS);

  const [
    usersByRole,
    submissionsByStatus,
    totalFeedback,
    dailyRows,
    reviewsByReviewer,
    commentsByMentor,
    reviewers,
    waiting,
    staleCount,
    recentUsers,
    recentSubmissions,
    recentDecisions,
    recentComments,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.feedback.count(),
    // Bucket by the admin's local calendar day, not the server's (created_at is stored in UTC)
    prisma.$queryRaw<{ day: string; status: SubmissionStatus; count: number }[]>`
      SELECT to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz}::text, 'YYYY-MM-DD') AS day,
             status,
             COUNT(*)::int AS count
      FROM submissions
      WHERE created_at >= NOW() - INTERVAL '15 days'
      GROUP BY 1, 2`,
    prisma.submission.groupBy({
      by: ["reviewerId", "status"],
      where: { reviewerId: { not: null } },
      _count: { _all: true },
    }),
    prisma.feedback.groupBy({ by: ["mentorId"], where: { mentorId: { not: null } }, _count: { _all: true } }),
    prisma.user.findMany({ where: { role: { in: REVIEWER_ROLES } }, select: { id: true, name: true, email: true, role: true } }),
    // A pending row only changes when it's resubmitted or reopened, so updatedAt is
    // when it (re)joined the queue — that's what "waiting" is measured from
    prisma.submission.findMany({
      where: { status: SubmissionStatus.PENDING },
      orderBy: { updatedAt: "asc" },
      take: 5,
      include: listInclude,
    }),
    prisma.submission.count({ where: { status: SubmissionStatus.PENDING, updatedAt: { lt: staleBefore } } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, role: true, createdAt: true } }),
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, projectName: true, createdAt: true, student: { select: { name: true } } },
    }),
    prisma.submission.findMany({
      where: { status: { not: SubmissionStatus.PENDING }, reviewerId: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, projectName: true, status: true, updatedAt: true, reviewerId: true, reviewer: { select: { name: true } } },
    }),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        submissionId: true,
        mentorId: true,
        mentor: { select: { name: true } },
        submission: { select: { projectName: true } },
      },
    }),
  ]);

  const byRole = (r: Role) => usersByRole.find((g) => g.role === r)?._count._all ?? 0;
  const byStatus = (s: SubmissionStatus) => submissionsByStatus.find((g) => g.status === s)?._count._all ?? 0;

  // ── 14-day series, oldest first, with empty days filled in ──
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const daily = Array.from({ length: CHART_DAYS }, (_, i) => {
    const date = dayKey.format(new Date(Date.now() - (CHART_DAYS - 1 - i) * DAY_MS));
    const rows = dailyRows.filter((row) => row.day === date);
    const get = (s: SubmissionStatus) => rows.find((row) => row.status === s)?.count ?? 0;
    return {
      date,
      pending: get(SubmissionStatus.PENDING),
      approved: get(SubmissionStatus.APPROVED),
      rejected: get(SubmissionStatus.REJECTED),
    };
  });

  // ── Reviewer workload ──
  const reviewerStats = reviewers
    .map((r) => {
      const decided = (s: SubmissionStatus) =>
        reviewsByReviewer.find((g) => g.reviewerId === r.id && g.status === s)?._count._all ?? 0;
      return {
        ...r,
        approved: decided(SubmissionStatus.APPROVED),
        rejected: decided(SubmissionStatus.REJECTED),
        comments: commentsByMentor.find((g) => g.mentorId === r.id)?._count._all ?? 0,
      };
    })
    .sort((a, b) => b.approved + b.rejected - (a.approved + a.rejected) || b.comments - a.comments);

  // ── Activity feed, merged from what's already stored ──
  const decisions: Activity[] = recentDecisions.map((s) => ({
    id: `review-${s.id}`,
    kind: s.status === SubmissionStatus.APPROVED ? "approved" : "rejected",
    at: s.updatedAt,
    actor: s.reviewer?.name ?? "A reviewer",
    subject: s.projectName,
    submissionId: s.id,
  }));

  // A rejection reason is stored as a comment in the same transaction — don't list it twice
  const isDecisionNote = (c: (typeof recentComments)[number]) =>
    recentDecisions.some(
      (d) => d.id === c.submissionId && d.reviewerId === c.mentorId && Math.abs(d.updatedAt.getTime() - c.createdAt.getTime()) < 5000
    );

  const activity: Activity[] = [
    ...recentUsers.map((u) => ({ id: `user-${u.id}`, kind: "joined" as const, at: u.createdAt, actor: u.name, role: u.role })),
    ...recentSubmissions.map((s) => ({
      id: `submission-${s.id}`,
      kind: "submitted" as const,
      at: s.createdAt,
      actor: s.student.name,
      subject: s.projectName,
      submissionId: s.id,
    })),
    ...decisions,
    ...recentComments
      .filter((c) => !isDecisionNote(c))
      .map((c) => ({
        id: `comment-${c.id}`,
        kind: "commented" as const,
        at: c.createdAt,
        actor: c.mentor?.name ?? "A former mentor",
        subject: c.submission.projectName,
        submissionId: c.submissionId,
      })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  return {
    users: {
      total: byRole(Role.STUDENT) + byRole(Role.MENTOR) + byRole(Role.ADMIN),
      students: byRole(Role.STUDENT),
      mentors: byRole(Role.MENTOR),
      admins: byRole(Role.ADMIN),
    },
    submissions: {
      total: byStatus(SubmissionStatus.PENDING) + byStatus(SubmissionStatus.APPROVED) + byStatus(SubmissionStatus.REJECTED),
      pending: byStatus(SubmissionStatus.PENDING),
      approved: byStatus(SubmissionStatus.APPROVED),
      rejected: byStatus(SubmissionStatus.REJECTED),
      waitingOverDays: STALE_AFTER_DAYS,
      waitingOver: staleCount,
    },
    feedback: { total: totalFeedback },
    daily,
    reviewers: reviewerStats,
    waiting,
    activity,
  };
};

// ─── Users ──────────────────────────────────────────────────────────────────

// Paginated, filter by role, search name/email.
// Also returns per-role counts (respecting the search) for the filter tabs.
const listUsers = async ({ page, limit, role, search }: ListUsersQuery) => {
  const contains = search ? ({ contains: search, mode: "insensitive" } as const) : undefined;
  const searchWhere: Prisma.UserWhereInput = contains ? { OR: [{ name: contains }, { email: contains }] } : {};
  const where: Prisma.UserWhereInput = role ? { ...searchWhere, role } : searchWhere;

  const [users, totalCount, roleGroups] = await Promise.all([
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], where: searchWhere, _count: { _all: true } }),
  ]);

  const roleCount = (r: Role) => roleGroups.find((g) => g.role === r)?._count._all ?? 0;

  return {
    users,
    pagination: pageInfo(page, limit, totalCount),
    roleCounts: {
      ALL: roleGroups.reduce((sum, g) => sum + g._count._all, 0),
      STUDENT: roleCount(Role.STUDENT),
      MENTOR: roleCount(Role.MENTOR),
      ADMIN: roleCount(Role.ADMIN),
    },
  };
};

// Create an account with any role (how mentors get onboarded)
const createUser = async ({ name, email, password, role }: CreateUserInput) => {
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw emailTaken();

  try {
    return await prisma.user.create({
      data: { name, email, role, password: await bcrypt.hash(password, BCRYPT_COST) },
      select: adminUserSelect,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
};

// Rename, change role, or reset password.
// Role changes take effect on the user's very next request, because
// `authenticate` re-reads the role from the database every time.
const updateUser = async (id: string, adminId: string, { name, role, password }: UpdateUserInput) => {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) throw new HttpError(404, "User not found.");

  // Guarantees there is always at least one admin: you can't demote yourself,
  // and any other admin you demote leaves you in place.
  if (role && role !== target.role && target.id === adminId) {
    throw new HttpError(400, "You can't change your own role. Ask another admin to do it.", {
      role: "You can't change your own role.",
    });
  }

  return prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      password: password ? await bcrypt.hash(password, BCRYPT_COST) : undefined,
    },
    select: adminUserSelect,
  });
};

// Deleting a student also deletes their submissions (and those submissions'
// feedback). Reviews and comments written by a deleted mentor are kept, unattributed.
const deleteUser = async (id: string, adminId: string) => {
  if (id === adminId) {
    throw new HttpError(400, "You can't delete your own account.");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  if (!target) throw new HttpError(404, "User not found.");

  await prisma.user.delete({ where: { id } });

  return target;
};

// ─── Submissions ────────────────────────────────────────────────────────────
// Admins list and review through /api/submissions like mentors do; these
// add the powers mentors don't have.

// Set any status, e.g. reopen a decision made in error. Rejecting still requires a reason.
const overrideSubmissionStatus = async (id: string, adminId: string, { status, comment }: OverrideStatusInput) => {
  return prisma.$transaction(
    async (tx) => {
      const exists = await tx.submission.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new HttpError(404, "Submission not found.");

      await tx.submission.update({
        where: { id },
        data: { status, reviewerId: status === SubmissionStatus.PENDING ? null : adminId },
      });

      if (comment) {
        await tx.feedback.create({ data: { comment, submissionId: id, mentorId: adminId } });
      }

      return tx.submission.findUniqueOrThrow({ where: { id }, include: listInclude });
    },
    { timeout: 15_000 }
  );
};

// Also removes its feedback (cascade)
const deleteSubmission = async (id: string) => {
  const target = await prisma.submission.findUnique({ where: { id }, select: { projectName: true } });
  if (!target) throw new HttpError(404, "Submission not found.");

  await prisma.submission.delete({ where: { id } });

  return target;
};

// ─── Feedback ───────────────────────────────────────────────────────────────

// Every comment on the platform, newest first.
// Search matches the comment, the project name, or the mentor's name.
const listFeedback = async ({ page, limit, search }: ListFeedbackQuery) => {
  const contains = search ? ({ contains: search, mode: "insensitive" } as const) : undefined;
  const where: Prisma.FeedbackWhereInput = contains
    ? { OR: [{ comment: contains }, { submission: { projectName: contains } }, { mentor: { name: contains } }] }
    : {};

  const [feedback, totalCount] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        mentor: userSummary,
        submission: { include: listInclude },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.feedback.count({ where }),
  ]);

  return { feedback, pagination: pageInfo(page, limit, totalCount) };
};

// Moderation
const deleteFeedback = async (id: string) => {
  const exists = await prisma.feedback.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Feedback not found.");

  await prisma.feedback.delete({ where: { id } });
};

export const adminService = {
  getOverview,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  overrideSubmissionStatus,
  deleteSubmission,
  listFeedback,
  deleteFeedback,
};
