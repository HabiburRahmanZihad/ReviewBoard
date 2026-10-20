import { z } from "zod";

// Client-side mirror of server/src/validation/schemas.ts — keep the two in sync.
// These rules give instant, inline feedback; the server re-validates everything
// and remains the source of truth.

const GITHUB_OWNER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const GITHUB_REPO = /^[\w.-]{1,100}$/;

function isGithubRepoUrl(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") return false;
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return false;
  const repo = segments[1].replace(/\.git$/i, "");
  return GITHUB_OWNER.test(segments[0]) && GITHUB_REPO.test(repo) && !/^\.+$/.test(repo);
}

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
  if (!host.includes(".")) return "Live link must use a full domain, e.g. https://my-app.vercel.app.";
  if (host === "github.com" || host === "www.github.com") {
    return "Live link should point to the deployed site, not the GitHub repository.";
  }
  return null;
}

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const email = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .pipe(z.email("Please enter a valid email address."));

// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[A-Za-z]/, "Password must contain at least one letter.")
  .regex(/\d/, "Password must contain at least one number.");

export const signupSchema = z
  .object({
    name: text("Name", 2, 50),
    email,
    password,
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

// ─── Submissions ────────────────────────────────────────────────────────────

export const submissionSchema = z.object({
  projectName: text("Project name", 3, 100),
  repoUrl: z
    .string()
    .trim()
    .min(1, "Repository URL is required.")
    .max(300, "Repository URL is too long.")
    .refine(isGithubRepoUrl, "Enter the root URL of a GitHub repository, e.g. https://github.com/username/project."),
  liveUrl: z
    .string()
    .trim()
    .min(1, "Live link is required.")
    .max(2048, "Live link is too long.")
    .superRefine((value, ctx) => {
      const problem = liveUrlProblem(value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  description: text("Description", 20, 2000),
});

// ─── Admin ──────────────────────────────────────────────────────────────────

const role = z.enum(["STUDENT", "MENTOR", "ADMIN"], { error: "Choose a role." });

export const createUserSchema = z.object({ name: text("Name", 2, 50), email, role, password });

// Leaving the password blank keeps the current one
export const editUserSchema = z.object({
  name: text("Name", 2, 50),
  role,
  password: z
    .string()
    .refine((v) => v === "" || v.length >= 8, "Password must be at least 8 characters.")
    .refine((v) => v.length <= 72, "Password must be at most 72 characters.")
    .refine((v) => v === "" || (/[A-Za-z]/.test(v) && /\d/.test(v)), "Password must contain a letter and a number."),
});

export const COMMENT_MIN = 5;
export const COMMENT_MAX = 2000;
