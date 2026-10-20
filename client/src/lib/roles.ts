import { Role, User } from "@/types";

/** Mentors and admins can review submissions. */
export const isReviewer = (role: Role): boolean => role === "MENTOR" || role === "ADMIN";

export const isStudent = (role: Role): boolean => role === "STUDENT";

export const isAdmin = (role: Role): boolean => role === "ADMIN";

/** Where each kind of user lands after signing in. */
export const homePathFor = (user: User | null): string => {
  if (!user) return "/login";
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "MENTOR") return "/dashboard";
  return "/submissions";
};

export const roleLabel: Record<Role, string> = {
  STUDENT: "Student",
  MENTOR: "Mentor",
  ADMIN: "Admin",
};
