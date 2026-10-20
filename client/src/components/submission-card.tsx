import { MessageSquare, RotateCcw } from "lucide-react";
import { daysSince, formatDateTime, formatRelative } from "@/lib/format";
import { Submission } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { RepoSlug } from "@/components/repo-slug";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";

/** Responsive grid: 1 → 2 → 3 → 4 cards per row as the screen widens. */
export const CARD_GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function waitingLabel(since: string) {
  const days = daysSince(since);
  return days < 1 ? "Waiting since today" : `Waiting ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * A submission as a card. The whole card opens the review sheet (a stretched
 * button keeps it keyboard-reachable); links and actions sit above it.
 *  - reviewer: shows the student, waiting time / reviewer, and comment count
 *  - student:  shows the latest feedback, and Resubmit when rejected
 */
export function SubmissionCard({
  submission,
  audience,
  onOpen,
  onResubmit,
}: {
  submission: Submission;
  audience: "student" | "reviewer";
  onOpen: () => void;
  onResubmit?: () => void;
}) {
  const latest = submission.feedbacks?.[0];
  const comments = submission._count?.feedbacks ?? 0;
  const showFeedback = audience === "student" && latest;

  return (
    <article className="group relative flex min-w-0 flex-col rounded-xl border bg-card p-4 transition-colors focus-within:ring-3 focus-within:ring-ring/30 hover:border-foreground/20 hover:bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={submission.status} />
        <time
          dateTime={submission.createdAt}
          title={`Submitted ${formatDateTime(submission.createdAt)}`}
          className="truncate text-xs text-muted-foreground"
        >
          {formatRelative(submission.createdAt)}
        </time>
      </div>

      <h3 className="mt-3 font-heading text-[15px] leading-snug font-semibold">
        <button
          type="button"
          onClick={onOpen}
          className="line-clamp-2 text-left after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none"
        >
          {submission.projectName}
        </button>
      </h3>
      <RepoSlug repoUrl={submission.repoUrl} className="relative z-10 mt-1 max-w-full self-start" />

      <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
        {showFeedback ? (
          <>
            <span className="font-medium text-foreground">{latest.mentor?.name ?? "Mentor"}:</span> {latest.comment}
          </>
        ) : (
          submission.description
        )}
      </p>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          {audience === "reviewer" ? (
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar name={submission.student.name} className="size-6 text-[9px]" />
              <span className="min-w-0">
                <span className="block truncate text-foreground">{submission.student.name}</span>
                <span className="block truncate">
                  {submission.status === "PENDING"
                    ? waitingLabel(submission.updatedAt)
                    : submission.reviewer
                      ? `by ${submission.reviewer.name}`
                      : "Reviewed"}
                </span>
              </span>
            </span>
          ) : (
            <span className="truncate">
              {submission.status === "PENDING"
                ? "Waiting for review"
                : submission.reviewer
                  ? `Reviewed by ${submission.reviewer.name}`
                  : "Reviewed"}
            </span>
          )}
          <span className="flex shrink-0 items-center gap-1 tabular-nums" title={`${comments} comment${comments === 1 ? "" : "s"}`}>
            <MessageSquare className="size-3.5" aria-hidden />
            {comments}
            <span className="sr-only">comments</span>
          </span>
        </div>

        {audience === "student" && submission.status === "REJECTED" && onResubmit && (
          <Button size="sm" className="relative z-10 mt-3 w-full" onClick={onResubmit}>
            <RotateCcw data-icon="inline-start" />
            Resubmit
          </Button>
        )}
      </div>
    </article>
  );
}

/** Placeholder cards while the first page loads. */
export function SubmissionCardSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className={CARD_GRID}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-xl border bg-card" />
      ))}
    </div>
  );
}
