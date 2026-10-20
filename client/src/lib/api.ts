import {
  ApiResponse,
  AuthResponse,
  LoginInput,
  SignupInput,
  CreateSubmissionInput,
  SubmissionListResponse,
  StatsResponse,
  Submission,
  Feedback,
  SubmissionStatus,
  ReviewInput,
  AdminOverview,
  AdminUser,
  FeedbackListResponse,
  Role,
  UserInput,
  UserListResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const TOKEN_KEY = "token";

/** Fired when the server rejects our token, so the auth provider can sign the user out. */
export const UNAUTHORIZED_EVENT = "reviewboard:unauthorized";

// ─── Errors ─────────────────────────────────────────────────────────────────

/** A failed API call: HTTP status, a human-readable message, and optional per-field errors. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

// ─── Core Request Helper ────────────────────────────────────────────────────

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    // Let callers recognise their own cancellations
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  // Non-JSON bodies (e.g. a proxy's HTML error page) shouldn't crash the UI
  const data = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      response.status,
      data?.message || `Request failed with status ${response.status}.`,
      data?.errors
    );
  }

  return data ?? { success: true, message: "" };
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export const authApi = {
  login: (input: LoginInput) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: input }),

  signup: (input: SignupInput) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: input }),

  getMe: () => request<{ user: AuthResponse["user"] }>("/auth/me"),
};

// ─── Submissions API ────────────────────────────────────────────────────────

export interface ListParams {
  page?: number;
  limit?: number;
  status?: SubmissionStatus;
  search?: string;
}

/** Builds "?a=1&b=2", skipping empty values. */
function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const submissionsApi = {
  create: (input: CreateSubmissionInput) =>
    request<{ submission: Submission }>("/submissions", { method: "POST", body: input }),

  resubmit: (id: string, input: CreateSubmissionInput) =>
    request<{ submission: Submission }>(`/submissions/${id}`, { method: "PUT", body: input }),

  list: (params: ListParams = {}, signal?: AbortSignal) =>
    request<SubmissionListResponse>(`/submissions${toQuery({ ...params })}`, { signal }),

  getById: (id: string, signal?: AbortSignal) =>
    request<{ submission: Submission }>(`/submissions/${id}`, { signal }),

  review: (id: string, input: ReviewInput) =>
    request<{ submission: Submission }>(`/submissions/${id}/status`, { method: "PATCH", body: input }),

  addFeedback: (id: string, comment: string) =>
    request<{ feedback: Feedback }>(`/submissions/${id}/feedback`, { method: "POST", body: { comment } }),

  /** Reviewers get platform-wide counts; students get counts for their own submissions. */
  getStats: (signal?: AbortSignal) => request<StatsResponse>("/submissions/stats", { signal }),
};

// ─── Admin API ──────────────────────────────────────────────────────────────

export const adminApi = {
  overview: (signal?: AbortSignal) =>
    request<AdminOverview>(
      `/admin/overview${toQuery({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}`,
      { signal }
    ),

  listUsers: (params: { page?: number; limit?: number; role?: Role; search?: string }, signal?: AbortSignal) =>
    request<UserListResponse>(`/admin/users${toQuery({ ...params })}`, { signal }),

  createUser: (input: UserInput) =>
    request<{ user: AdminUser }>("/admin/users", { method: "POST", body: input }),

  updateUser: (id: string, input: UserInput) =>
    request<{ user: AdminUser }>(`/admin/users/${id}`, { method: "PATCH", body: input }),

  deleteUser: (id: string) => request(`/admin/users/${id}`, { method: "DELETE" }),

  /** Move a submission to any status — e.g. reopen a decision. Rejecting needs a comment. */
  setStatus: (id: string, input: { status: SubmissionStatus; comment?: string }) =>
    request<{ submission: Submission }>(`/admin/submissions/${id}/status`, { method: "PATCH", body: input }),

  deleteSubmission: (id: string) => request(`/admin/submissions/${id}`, { method: "DELETE" }),

  listFeedback: (params: { page?: number; limit?: number; search?: string }, signal?: AbortSignal) =>
    request<FeedbackListResponse>(`/admin/feedback${toQuery({ ...params })}`, { signal }),

  deleteFeedback: (id: string) => request(`/admin/feedback/${id}`, { method: "DELETE" }),
};
