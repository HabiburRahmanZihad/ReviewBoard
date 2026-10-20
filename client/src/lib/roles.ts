import { Role, User } from "@/types";

/** Mentors and the seeded admin can review submissions. */
export const isReviewer = (role: Role): boolean => role === "MENTOR" || role === "ADMIN";

export const isStudent = (role: Role): boolean => role === "STUDENT";

/** Where each kind of user lands after signing in. */
export const homePathFor = (user: User | null): string => {
  if (!user) return "/login";
  return isReviewer(user.role) ? "/dashboard" : "/submissions";
};

export const roleLabel: Record<Role, string> = {
  STUDENT: "Student",
  MENTOR: "Mentor",
  ADMIN: "Admin",
};
