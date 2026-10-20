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
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── Helper ─────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export const authApi = {
  async login(input: LoginInput): Promise<ApiResponse<AuthResponse>> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<AuthResponse>(res);
  },

  async signup(input: SignupInput): Promise<ApiResponse<AuthResponse>> {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<AuthResponse>(res);
  },

  async getMe(): Promise<ApiResponse<{ user: AuthResponse["user"] }>> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ─── Submissions API ────────────────────────────────────────────────────────

export const submissionsApi = {
  async create(input: CreateSubmissionInput): Promise<ApiResponse<{ submission: Submission }>> {
    const res = await fetch(`${API_BASE_URL}/submissions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse(res);
  },

  async list(params?: {
    page?: number;
    limit?: number;
    status?: SubmissionStatus;
    search?: string;
  }): Promise<ApiResponse<SubmissionListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);

    const res = await fetch(`${API_BASE_URL}/submissions?${searchParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getById(id: string): Promise<ApiResponse<{ submission: Submission }>> {
    const res = await fetch(`${API_BASE_URL}/submissions/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateStatus(
    id: string,
    status: "APPROVED" | "REJECTED"
  ): Promise<ApiResponse<{ submission: Submission }>> {
    const res = await fetch(`${API_BASE_URL}/submissions/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async addFeedback(
    id: string,
    comment: string
  ): Promise<ApiResponse<{ feedback: Feedback }>> {
    const res = await fetch(`${API_BASE_URL}/submissions/${id}/feedback`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ comment }),
    });
    return handleResponse(res);
  },

  async getStats(): Promise<ApiResponse<StatsResponse>> {
    const res = await fetch(`${API_BASE_URL}/submissions/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
