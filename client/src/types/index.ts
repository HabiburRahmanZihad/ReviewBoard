// ─── User Types ─────────────────────────────────────────────────────────────

export type Role = "STUDENT" | "MENTOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

// ─── Submission Types ───────────────────────────────────────────────────────

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Submission {
  id: string;
  projectName: string;
  repoUrl: string;
  liveUrl: string | null;
  description: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  studentId: string;
  reviewerId: string | null;
  student: Pick<User, "id" | "name" | "email">;
  reviewer: Pick<User, "id" | "name" | "email"> | null;
  feedbacks?: Feedback[];
  _count?: {
    feedbacks: number;
  };
}

export interface CreateSubmissionInput {
  projectName: string;
  repoUrl: string;
  liveUrl?: string;
  description: string;
}

// ─── Feedback Types ─────────────────────────────────────────────────────────

export interface Feedback {
  id: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  submissionId: string;
  mentorId: string | null;
  mentor: Pick<User, "id" | "name" | "email"> | null;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SubmissionListResponse {
  submissions: Submission[];
  pagination: PaginationInfo;
}

export interface StatsResponse {
  stats: {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalSubmissions: number;
    totalStudents: number;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}
