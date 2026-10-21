import { z } from "zod";
import { Role, SubmissionStatus } from "@prisma/client";

// ─── GitHub URL Canonicalisation ────────────────────────────────────────────
// GitHub usernames: alphanumerics and single hyphens, no leading/trailing hyphen, max 39.
const GITHUB_OWNER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
// Repository names: letters, digits, ".", "-", "_", max 100.
const GITHUB_REPO = /^[\w.-]{1,100}$/;

/**
 * Reduces every spelling of the same repository to one canonical form:
 *
 *   http://www.GitHub.com/Alice/My-App.git/?tab=readme  →  https://github.com/alice/my-app
 *
 * GitHub treats owner and repo names case-insensitively, so comparing canonical
 * URLs is what makes duplicate detection reliable. Returns `null` when the input
 * is not the root URL of a GitHub repository.
 */
export function normalizeRepoUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;

  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (!GITHUB_OWNER.test(owner) || !GITHUB_REPO.test(repo) || /^\.+$/.test(repo)) return null;

  return `https://github.com/${owner}/${repo}`.toLowerCase();
}

/**
 * A live link must be a publicly reachable http(s) site — not localhost and not
 * the GitHub repository page itself (a common beginner mix-up).
 */
function liveUrlProblem(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "Live link must be a valid URL, e.g. https://my-app.vercel.app.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Live link must start with http:// or https://.";
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || /^(127\.|0\.0\.0\.0$|\[::1\]$)/.test(host)) {
    return "Live link must be publicly reachable — localhost links only work on your machine.";
  }
  if (!host.includes(".")) {
    return "Live link must use a full domain, e.g. https://my-app.vercel.app.";
  }
  if (host === "github.com" || host === "www.github.com") {
    return "Live link should point to the deployed site, not the GitHub repository.";
  }
  return null;
}

// ─── Reusable Field Builders ────────────────────────────────────────────────

/** Trimmed, whitespace-collapsed text with "required" reported before length errors. */
const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const email = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .pipe(z.email("Please enter a valid email address."));

const name = text("Name", 2, 50).transform((s) => s.replace(/\s+/g, " "));

// bcrypt only uses the first 72 bytes of a password, so cap it there
const password = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[A-Za-z]/, "Password must contain at least one letter.")
  .regex(/\d/, "Password must contain at least one number.");

// Shared list-query fields: ?page=&limit=&search=
const pagination = {
  page: z.coerce.number().int().min(1, "page must be 1 or greater.").default(1),
  limit: z.coerce.number().int().min(1).max(50, "limit must be at most 50.").default(10),
};

const search = z
  .string()
  .trim()
  .max(100, "search must be at most 100 characters.")
  .optional()
  .transform((value) => value || undefined);

// ─── Auth ───────────────────────────────────────────────────────────────────

export const signupSchema = z.object({ name, email, password });

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: "Password is required." })
    .min(1, "Password is required.")
    .max(72, "Password must be at most 72 characters."),
});

// ─── Submissions ────────────────────────────────────────────────────────────

export const submissionSchema = z.object({
  projectName: text("Project name", 3, 100).transform((s) => s.replace(/\s+/g, " ")),
  repoUrl: z
    .string({ error: "Repository URL is required." })
    .trim()
    .min(1, "Repository URL is required.")
    .max(300, "Repository URL is too long.")
    .refine(
      (value) => normalizeRepoUrl(value) !== null,
      "Enter the root URL of a GitHub repository, e.g. https://github.com/username/project."
    )
    .transform((value) => normalizeRepoUrl(value)!),
  liveUrl: z
    .string({ error: "Live link is required." })
    .trim()
    .min(1, "Live link is required.")
    .max(2048, "Live link is too long.")
    .superRefine((value, ctx) => {
      const problem = liveUrlProblem(value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  description: text("Description", 20, 2000),
});

export const listSubmissionsQuerySchema = z.object({
  ...pagination,
  status: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(SubmissionStatus, { error: "status must be one of PENDING, APPROVED, REJECTED." }))
    .optional(),
  search,
});

const comment = text("Comment", 5, 2000);

// Optional comment; an empty string means "no comment"
const optionalComment = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .pipe(comment.optional());

const requireReasonToReject = (data: { status: SubmissionStatus; comment?: string }, ctx: z.RefinementCtx) => {
  if (data.status === SubmissionStatus.REJECTED && !data.comment) {
    ctx.addIssue({
      code: "custom",
      path: ["comment"],
      message: "A reason is required when rejecting, so the student knows what to fix.",
    });
  }
};

export const feedbackSchema = z.object({ comment });

export const reviewSchema = z
  .object({
    status: z.enum([SubmissionStatus.APPROVED, SubmissionStatus.REJECTED], {
      error: "Status must be either APPROVED or REJECTED.",
    }),
    comment: optionalComment,
  })
  .superRefine(requireReasonToReject);

// ─── Admin ──────────────────────────────────────────────────────────────────

const role = z.enum(Role, { error: "Role must be one of STUDENT, MENTOR, ADMIN." });

export const listUsersQuerySchema = z.object({
  ...pagination,
  role: z.string().trim().toUpperCase().pipe(role).optional(),
  search,
});

export const createUserSchema = z.object({ name, email, password, role });

export const updateUserSchema = z
  .object({
    name: name.optional(),
    role: role.optional(),
    // Lets an admin reset a forgotten password
    password: password.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), "Nothing to update.");

// An admin can move a submission to any status, e.g. to reopen a decision made in error
export const overrideStatusSchema = z
  .object({
    status: z.enum(SubmissionStatus, { error: "status must be one of PENDING, APPROVED, REJECTED." }),
    comment: optionalComment,
  })
  .superRefine(requireReasonToReject);

export const listFeedbackQuerySchema = z.object({ ...pagination, search });

// IANA timezone used to group activity by the viewer's local day, e.g. "Asia/Dhaka"; falls back to UTC
export const overviewQuerySchema = z.object({
  tz: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => {
      if (!value) return "UTC";
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return value;
      } catch {
        return "UTC";
      }
    }),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type OverrideStatusInput = z.infer<typeof overrideStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
