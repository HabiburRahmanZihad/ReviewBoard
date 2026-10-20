import { Check, GitCommitHorizontal, MessageSquare, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineKind = "submitted" | "requeued" | "comment" | "approved" | "rejected";

/** The marker on the review timeline rail. Only decisions carry verdict color. */
export function TimelineNode({ kind, className }: { kind: TimelineKind; className?: string }) {
  const base = cn("relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border", className);
  if (kind === "approved")
    return (
      <span className={cn(base, "border-transparent bg-approved text-white")}>
        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  if (kind === "rejected")
    return (
      <span className={cn(base, "border-transparent bg-rejected text-white")}>
        <X className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  const Icon = kind === "submitted" ? GitCommitHorizontal : kind === "requeued" ? RotateCcw : MessageSquare;
  return (
    <span className={cn(base, "bg-card text-muted-foreground")}>
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}
