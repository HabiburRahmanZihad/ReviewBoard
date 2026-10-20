import { Prisma } from "@prisma/client";

// Never select a user's password hash into an API response — always go through these.
export const userSummary = { select: { id: true, name: true, email: true } } as const;

// Shape returned for submission list rows: the latest feedback is included so
// cards and tables can show it without an extra request. Prisma batches each
// relation into one extra query for the whole page (no N+1).
export const listInclude = {
  student: userSummary,
  reviewer: userSummary,
  feedbacks: { take: 1, orderBy: { createdAt: "desc" }, include: { mentor: userSummary } },
  _count: { select: { feedbacks: true } },
} satisfies Prisma.SubmissionInclude;

// Admin user rows: profile + how much each person has submitted, reviewed and commented
export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  _count: { select: { submissions: true, reviewedSubmissions: true, feedbacks: true } },
} satisfies Prisma.UserSelect;
