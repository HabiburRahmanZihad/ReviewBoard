import { GraduationCap, ListChecks, LucideIcon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { Role } from "@/types";

export const roleIcon: Record<Role, LucideIcon> = {
  STUDENT: GraduationCap,
  MENTOR: ListChecks,
  ADMIN: ShieldCheck,
};

export const roleDescription: Record<Role, string> = {
  STUDENT: "Submits projects and reads feedback",
  MENTOR: "Reviews, comments, approves and rejects",
  ADMIN: "Everything a mentor can do, plus manage people and data",
};

/** Roles are not verdicts, so they stay monochrome — the icon tells them apart. */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const Icon = roleIcon[role];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border bg-muted/50 px-2 text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      {roleLabel[role]}
    </span>
  );
}
