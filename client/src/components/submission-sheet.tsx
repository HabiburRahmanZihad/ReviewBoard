"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Ellipsis, ExternalLink, FolderGit2, Globe, RotateCcw, Trash, X } from "lucide-react";
import { adminApi, ApiError, getErrorMessage, submissionsApi } from "@/lib/api";
import { COMMENT_MAX, COMMENT_MIN } from "@/lib/validation";
import { confirmAction, showToast } from "@/lib/alerts";
import { formatDateTime, formatRelative, hostOf } from "@/lib/format";
import { useQuery } from "@/hooks/use-query";
import { Submission, SubmissionStatus } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { TimelineKind, TimelineNode } from "@/components/timeline-node";
import { RepoSlug } from "@/components/repo-slug";
import { UserAvatar } from "@/components/user-avatar";
import { Spinner } from "@/components/spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SheetMode = "student" | "reviewer" | "admin";

/** A full row from a list, or just an id (e.g. from the activity feed) — the sheet fetches the rest. */
export type SubmissionRef = Submission | { id: string };

const isFull = (ref: SubmissionRef): ref is Submission => "projectName" in ref;

/**
 * The full story of one submission: details, a review timeline, and the
 * actions available to whoever is looking at it.
 *  - student:  read feedback, resubmit when rejected
 *  - reviewer: comment, approve or reject while pending
 *  - admin:    everything a reviewer can do, plus reopen/override decisions,
 *              delete comments and delete the submission
 */
export function SubmissionSheet({
  submission,
  open,
  onOpenChange,
  mode,
  onChanged,
  onResubmit,
}: {
  submission: SubmissionRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SheetMode;
  onChanged?: () => void;
  onResubmit?: (submission: Submission) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {submission && (
          <Panel
            key={submission.id}
            summary={submission}
            mode={mode}
            onClose={() => onOpenChange(false)}
            onChanged={onChanged}
            onResubmit={onResubmit}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Panel({
  summary,
  mode,
  onClose,
  onChanged,
  onResubmit,
}: {
  summary: SubmissionRef;
  mode: SheetMode;
  onClose: () => void;
  onChanged?: () => void;
  onResubmit?: (submission: Submission) => void;
}) {
  const fetchDetails = useCallback(
    async (signal: AbortSignal) => (await submissionsApi.getById(summary.id, signal)).data!.submission,
    [summary.id]
  );
  const details = useQuery(fetchDetails);
  // Show the list row instantly; swap in the full record (every comment) once it arrives
  const submission = details.data ?? (isFull(summary) ? summary : null);
  const historyLoaded = Boolean(details.data);

  if (!submission) {
    return (
      <>
        <SheetHeader>
          <SheetTitle className="sr-only">Loading submission</SheetTitle>
          <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-6 w-64 animate-pulse rounded bg-muted" />
        </SheetHeader>
        <SheetBody>
          {details.error ? (
            <div className="flex items-center gap-3 text-[13px] text-destructive">
              {details.error}
              <Button variant="outline" size="xs" onClick={details.refetch}>
                Retry
              </Button>
            </div>
          ) : (
            <Spinner />
          )}
        </SheetBody>
      </>
    );
  }

  const changed = (close: boolean) => {
    onChanged?.();
    if (close) onClose();
    else details.refetch();
  };

  const deleteSubmission = async () => {
    const confirmed = await confirmAction({
      title: `Delete “${submission.projectName}”?`,
      description: "The submission and all of its feedback will be permanently removed. This can't be undone.",
      confirmLabel: "Delete submission",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await adminApi.deleteSubmission(submission.id);
      showToast("Submission deleted");
      changed(true);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const deleteComment = async (feedbackId: string) => {
    const confirmed = await confirmAction({
      title: "Delete this comment?",
      description: "The student will no longer see it. This can't be undone.",
      confirmLabel: "Delete comment",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await adminApi.deleteFeedback(feedbackId);
      showToast("Comment deleted");
      changed(false);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  return (
    <>
      <SheetHeader>
        <RepoSlug repoUrl={submission.repoUrl} icon />
        <SheetTitle className="mt-1.5 wrap-break-word">{submission.projectName}</SheetTitle>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground">
          <StatusBadge status={submission.status} />
          <span className="inline-flex items-center gap-2">
            <UserAvatar name={submission.student.name} className="size-5 text-[9px]" />
            <span>
              <span className="text-foreground">{submission.student.name}</span> · {submission.student.email}
            </span>
          </span>
        </div>
        {mode === "admin" && (
          <div className="absolute top-3.5 right-12">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem variant="destructive" onClick={deleteSubmission}>
                  <Trash aria-hidden />
                  Delete submission
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SheetHeader>

      <SheetBody className="space-y-7">
        <div className="flex flex-wrap gap-2">
          <a className={buttonVariants({ variant: "outline", size: "sm" })} href={submission.repoUrl} target="_blank" rel="noopener noreferrer">
            <FolderGit2 data-icon="inline-start" />
            Repository
            <ExternalLink data-icon="inline-end" className="text-muted-foreground" />
          </a>
          {submission.liveUrl && (
            <a className={buttonVariants({ variant: "outline", size: "sm" })} href={submission.liveUrl} target="_blank" rel="noopener noreferrer">
              <Globe data-icon="inline-start" />
              <span className="max-w-48 truncate">{hostOf(submission.liveUrl)}</span>
              <ExternalLink data-icon="inline-end" className="text-muted-foreground" />
            </a>
          )}
        </div>

        <section>
          <h3 className="eyebrow mb-2">Description</h3>
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word">{submission.description}</p>
        </section>

        <section>
          <h3 className="eyebrow mb-3">Activity</h3>
          {details.error ? (
            <div className="flex items-center gap-3 text-[13px] text-destructive">
              {details.error}
              <Button variant="outline" size="xs" onClick={details.refetch}>
                Retry
              </Button>
            </div>
          ) : (
            <Timeline
              submission={submission}
              loading={!historyLoaded}
              onDeleteComment={mode === "admin" ? deleteComment : undefined}
            />
          )}
        </section>
      </SheetBody>

      <SheetFooter>
        {mode === "student" ? (
          <StudentFooter submission={submission} onResubmit={onResubmit} />
        ) : (
          <ReviewComposer submission={submission} isAdmin={mode === "admin"} onDone={changed} />
        )}
      </SheetFooter>
    </>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────

type TimelineEvent = {
  id: string;
  kind: TimelineKind;
  at: string;
  actor?: string;
  body?: string;
  feedbackId?: string;
};

/**
 * Rebuilds the submission's story from what is stored: when it was submitted,
 * every comment, and the current decision. A rejection reason is saved as a
 * comment in the same moment as the decision, so it's attached to it instead
 * of being listed twice.
 */
function buildTimeline(s: Submission): TimelineEvent[] {
  const events: TimelineEvent[] = [{ id: "submitted", kind: "submitted", at: s.createdAt, actor: s.student.name }];
  let comments = [...(s.feedbacks ?? [])];

  if ((s.status === "APPROVED" || s.status === "REJECTED") && s.reviewer) {
    const decidedAt = new Date(s.updatedAt).getTime();
    const note = comments.find(
      (f) => f.mentorId === s.reviewerId && Math.abs(new Date(f.createdAt).getTime() - decidedAt) < 5000
    );
    if (note) comments = comments.filter((f) => f !== note);
    events.push({
      id: "decision",
      kind: s.status === "APPROVED" ? "approved" : "rejected",
      at: s.updatedAt,
      actor: s.reviewer.name,
      body: note?.comment,
      feedbackId: note?.id,
    });
  } else if (s.status === "PENDING" && new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime() > 60_000) {
    // A pending submission only changes when it's resubmitted or reopened
    events.push({ id: "requeued", kind: "requeued", at: s.updatedAt });
  }

  for (const f of comments) {
    events.push({ id: f.id, kind: "comment", at: f.createdAt, actor: f.mentor?.name ?? "Former mentor", body: f.comment, feedbackId: f.id });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

const EVENT_COPY: Record<TimelineEvent["kind"], string> = {
  submitted: "submitted the project",
  requeued: "Sent back to the review queue",
  comment: "commented",
  approved: "approved the submission",
  rejected: "rejected the submission",
};

function Timeline({
  submission,
  loading,
  onDeleteComment,
}: {
  submission: Submission;
  loading: boolean;
  onDeleteComment?: (feedbackId: string) => void;
}) {
  const events = buildTimeline(submission);

  return (
    <ol className="relative">
      {events.map((event, index) => (
        <li key={event.id} className="group/event relative flex gap-3 pb-6 last:pb-0">
          {(index < events.length - 1 || loading) && (
            <span className="absolute top-7 bottom-0 left-3.25 w-px bg-border" aria-hidden />
          )}
          <TimelineNode kind={event.kind} />
          <div className="min-w-0 flex-1 pt-0.75">
            <p className="text-[13px] leading-5">
              {event.actor && <span className="font-medium">{event.actor} </span>}
              <span className={event.actor ? "text-muted-foreground" : "font-medium"}>{EVENT_COPY[event.kind]}</span>
              <span className="text-muted-foreground">
                {" · "}
                <time dateTime={event.at} title={formatDateTime(event.at)}>
                  {formatRelative(event.at)}
                </time>
              </span>
            </p>
            {event.body && (
              <div className="relative mt-2 rounded-lg border bg-muted/40 px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                {event.body}
                {onDeleteComment && event.feedbackId && (
                  <button
                    type="button"
                    onClick={() => onDeleteComment(event.feedbackId!)}
                    className="absolute top-1.5 right-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover/event:opacity-100 hover:bg-background hover:text-destructive focus-visible:opacity-100"
                    aria-label="Delete comment"
                  >
                    <Trash className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
      {loading && (
        <li className="flex items-center gap-3 pt-1 text-[13px] text-muted-foreground">
          <span className="inline-flex size-7 items-center justify-center">
            <Spinner className="size-4" />
          </span>
          Loading full history…
        </li>
      )}
    </ol>
  );
}

// ─── Footers ─────────────────────────────────────────────────────────────────

function StudentFooter({ submission, onResubmit }: { submission: Submission; onResubmit?: (s: Submission) => void }) {
  if (submission.status === "REJECTED") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">Address the feedback above, then send it back for review.</p>
        {onResubmit && (
          <Button onClick={() => onResubmit(submission)}>
            <RotateCcw data-icon="inline-start" />
            Resubmit
          </Button>
        )}
      </div>
    );
  }
  return (
    <p className="text-[13px] text-muted-foreground">
      {submission.status === "PENDING"
        ? "Waiting for a mentor to review. You'll see their decision here."
        : "Approved. Nothing else to do for this project."}
    </p>
  );
}

type Action = "comment" | "approve" | "reject" | "reopen";

function ReviewComposer({
  submission,
  isAdmin,
  onDone,
}: {
  submission: Submission;
  isAdmin: boolean;
  onDone: (close: boolean) => void;
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const inFlight = useRef(false);
  const pending = submission.status === "PENDING";

  const run = async (action: Action) => {
    if (inFlight.current) return;
    const text = comment.trim();

    // Same rules as the server: a reason is required to reject or to post a comment
    const needsText = action === "comment" || action === "reject";
    if ((needsText || text) && text.length < COMMENT_MIN) {
      setError(
        action === "reject"
          ? `Add a reason (at least ${COMMENT_MIN} characters) so the student knows what to fix.`
          : `Comments need at least ${COMMENT_MIN} characters.`
      );
      document.getElementById("review-comment")?.focus();
      return;
    }

    inFlight.current = true;
    setBusy(action);
    setError("");
    try {
      if (action === "comment") {
        await submissionsApi.addFeedback(submission.id, text);
        setComment("");
        showToast("Comment posted");
        onDone(false);
      } else {
        const status: SubmissionStatus = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "PENDING";
        const body = { status, comment: text || undefined };
        // Pending submissions use the normal review flow; admins override decided ones
        if (pending && status !== "PENDING") await submissionsApi.review(submission.id, body as { status: "APPROVED" | "REJECTED" });
        else await adminApi.setStatus(submission.id, body);
        showToast(action === "approve" ? "Submission approved" : action === "reject" ? "Submission rejected" : "Reopened for review");
        onDone(status !== "PENDING");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Another reviewer decided first — show their decision instead
        showToast(err.message, "info");
        onDone(false);
      } else {
        setError(err instanceof ApiError && err.errors?.comment ? err.errors.comment : getErrorMessage(err));
      }
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const button = (action: Action, label: string, variant: "default" | "outline" | "secondary" | "danger", icon?: React.ReactNode) => (
    <Button variant={variant} disabled={busy !== null} onClick={() => run(action)}>
      {busy === action ? <Spinner className="size-4 text-current" /> : icon}
      {label}
    </Button>
  );

  return (
    <div className="space-y-3">
      <label htmlFor="review-comment" className="sr-only">
        {pending ? "Review comment" : "Comment"}
      </label>
      <Textarea
        id="review-comment"
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setError("");
        }}
        placeholder={
          pending
            ? "Leave a comment. Optional to approve, required to reject."
            : isAdmin
              ? "Leave a comment, or a reason if you change the decision…"
              : "Leave a follow-up comment for the student…"
        }
        maxLength={COMMENT_MAX}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "review-error" : undefined}
        className="max-h-48 resize-none bg-background"
      />
      {error && (
        <p id="review-error" role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {pending
            ? "Approving or rejecting is final for mentors."
            : isAdmin
              ? "As an admin you can change this decision."
              : "This decision is final. Ask an admin if it needs to change."}
        </p>
        <div className="flex flex-wrap gap-2">
          {button("comment", "Comment", "outline")}
          {pending && button("reject", "Reject", "danger", <X data-icon="inline-start" />)}
          {pending && button("approve", "Approve", "default", <Check data-icon="inline-start" />)}
          {!pending && isAdmin && button("reopen", "Reopen", "outline", <RotateCcw data-icon="inline-start" />)}
          {!pending && isAdmin && submission.status === "APPROVED" && button("reject", "Reject instead", "danger")}
          {!pending && isAdmin && submission.status === "REJECTED" && button("approve", "Approve instead", "default")}
        </div>
      </div>
    </div>
  );
}
