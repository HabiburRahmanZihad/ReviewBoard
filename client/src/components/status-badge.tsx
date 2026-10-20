import { cn } from "@/lib/utils";
import { SubmissionStatus } from "@/types";

export const statusLabel: Record<SubmissionStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** Verdict color lives in the dot; the label stays in ink so it reads in every theme. */
export const statusDot: Record<SubmissionStatus, string> = {
  PENDING: "bg-pending",
  APPROVED: "bg-approved",
  REJECTED: "bg-rejected",
};

export function StatusDot({ status, className }: { status: SubmissionStatus; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", statusDot[status], className)} aria-hidden />;
}

export function StatusBadge({ status, className }: { status: SubmissionStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      <StatusDot status={status} />
      {statusLabel[status]}
    </span>
  );
}
