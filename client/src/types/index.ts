// ─── User Types ─────────────────────────────────────────────────────────────

export type Role = "STUDENT" | "MENTOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

type UserSummary = Pick<User, "id" | "name" | "email">;

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
  student: UserSummary;
  reviewer: UserSummary | null;
  /** List rows carry only the latest feedback; the detail endpoint returns the full history. */
  feedbacks?: Feedback[];
  _count?: {
    feedbacks: number;
  };
}

export interface CreateSubmissionInput {
  projectName: string;
  repoUrl: string;
  liveUrl: string;
  description: string;
}

export interface ReviewInput {
  status: "APPROVED" | "REJECTED";
  comment?: string;
}

// ─── Feedback Types ─────────────────────────────────────────────────────────

export interface Feedback {
  id: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  submissionId: string;
  mentorId: string | null;
  mentor: UserSummary | null;
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

export interface Stats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalSubmissions: number;
  totalStudents: number;
}

export interface StatsResponse {
  stats: Stats;
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
