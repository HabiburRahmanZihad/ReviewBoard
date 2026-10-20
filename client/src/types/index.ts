// ─── User Types ─────────────────────────────────────────────────────────────

export type Role = "STUDENT" | "MENTOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

export type UserSummary = Pick<User, "id" | "name" | "email">;

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

// ─── Admin Types ────────────────────────────────────────────────────────────

export interface AdminUser extends User {
  createdAt: string;
  _count: { submissions: number; reviewedSubmissions: number; feedbacks: number };
}

export interface UserListResponse {
  users: AdminUser[];
  pagination: PaginationInfo;
  roleCounts: Record<"ALL" | Role, number>;
}

export interface UserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export interface DailyCount {
  date: string; // YYYY-MM-DD in the viewer's timezone
  pending: number;
  approved: number;
  rejected: number;
}

export interface ReviewerStat extends UserSummary {
  role: Role;
  approved: number;
  rejected: number;
  comments: number;
}

export interface ActivityItem {
  id: string;
  kind: "joined" | "submitted" | "approved" | "rejected" | "commented";
  at: string;
  actor: string;
  subject?: string;
  submissionId?: string;
  role?: Role;
}

export interface AdminOverview {
  users: { total: number; students: number; mentors: number; admins: number };
  submissions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    waitingOverDays: number;
    waitingOver: number;
  };
  feedback: { total: number };
  daily: DailyCount[];
  reviewers: ReviewerStat[];
  waiting: Submission[];
  activity: ActivityItem[];
}

export interface FeedbackWithSubmission extends Feedback {
  submission: Submission;
}

export interface FeedbackListResponse {
  feedback: FeedbackWithSubmission[];
  pagination: PaginationInfo;
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
