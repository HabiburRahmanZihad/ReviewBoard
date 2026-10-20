"use client";

import { useCallback, useRef, useState } from "react";
import { ExternalLink, FolderGit2, Globe, RotateCcw } from "lucide-react";
import { ApiError, getErrorMessage, submissionsApi } from "@/lib/api";
import { COMMENT_MAX, COMMENT_MIN } from "@/lib/validation";
import { showToast } from "@/lib/alerts";
import { formatDate, formatDateTime } from "@/lib/format";
import { useQuery } from "@/hooks/use-query";
import { Submission } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { FormBanner } from "@/components/form-field";
import { Spinner } from "@/components/spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const linkButton = buttonVariants({ variant: "outline", size: "sm" });

/**
 * Full view of one submission with its feedback history.
 * Reviewers (`canReview`) also get the approve / reject / comment controls;
 * students get a "Resubmit" shortcut when their submission was rejected.
 */
export function SubmissionDetailsDialog({
  submission,
  open,
  onOpenChange,
  canReview,
  onChanged,
  onResubmit,
}: {
  submission: Submission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canReview: boolean;
  onChanged?: () => void;
  onResubmit?: (submission: Submission) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {submission && (
          <DetailsBody
            key={submission.id}
            summary={submission}
            canReview={canReview}
            onClose={() => onOpenChange(false)}
            onChanged={onChanged}
            onResubmit={onResubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailsBody({
  summary,
  canReview,
  onClose,
  onChanged,
  onResubmit,
}: {
  summary: Submission;
  canReview: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onResubmit?: (submission: Submission) => void;
}) {
  const fetchDetails = useCallback(
    async (signal: AbortSignal) => (await submissionsApi.getById(summary.id, signal)).data!.submission,
    [summary.id]
  );
  const details = useQuery(fetchDetails);
  // Show the list row immediately; swap in the full record (all feedback) once loaded
  const submission = details.data ?? summary;

  return (
    <>
      <DialogHeader className="pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle className="text-lg">{submission.projectName}</DialogTitle>
          <StatusBadge status={submission.status} />
        </div>
        <DialogDescription>
          By {submission.student.name} ({submission.student.email}) · Submitted {formatDate(submission.createdAt)}
          {submission.reviewer && <> · Reviewed by {submission.reviewer.name}</>}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap gap-2">
        <a className={linkButton} href={submission.repoUrl} target="_blank" rel="noopener noreferrer">
          <FolderGit2 data-icon="inline-start" />
          Repository
          <ExternalLink data-icon="inline-end" className="opacity-60" />
        </a>
        {submission.liveUrl && (
          <a className={linkButton} href={submission.liveUrl} target="_blank" rel="noopener noreferrer">
            <Globe data-icon="inline-start" />
            Live site
            <ExternalLink data-icon="inline-end" className="opacity-60" />
          </a>
        )}
      </div>

      <section className="space-y-1.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</h3>
        <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{submission.description}</p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Feedback</h3>
        {details.isLoading && !details.data ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner className="size-4" /> Loading feedback…
          </div>
        ) : details.error ? (
          <div className="flex items-center gap-3 text-sm text-destructive">
            {details.error}
            <Button variant="outline" size="xs" onClick={details.refetch}>
              Retry
            </Button>
          </div>
        ) : submission.feedbacks && submission.feedbacks.length > 0 ? (
          <ul className="space-y-2">
            {submission.feedbacks.map((feedback) => (
              <li key={feedback.id} className="rounded-md border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{feedback.mentor?.name ?? "Former mentor"}</span>
                  {" · "}
                  {formatDateTime(feedback.createdAt)}
                </p>
                <p className="whitespace-pre-wrap wrap-break-word">{feedback.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No feedback yet.</p>
        )}
      </section>

      {canReview && (
        <ReviewPanel
          submission={submission}
          onDone={(close) => {
            onChanged?.();
            if (close) onClose();
            else details.refetch();
          }}
        />
      )}

      {!canReview && submission.status === "REJECTED" && onResubmit && (
        <div className="flex justify-end">
          <Button onClick={() => onResubmit(submission)}>
            <RotateCcw data-icon="inline-start" />
            Resubmit
          </Button>
        </div>
      )}
    </>
  );
}

type Action = "APPROVED" | "REJECTED" | "COMMENT";

function ReviewPanel({ submission, onDone }: { submission: Submission; onDone: (close: boolean) => void }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const inFlight = useRef(false);
  const isPending = submission.status === "PENDING";

  const run = async (action: Action) => {
    if (inFlight.current) return;
    const text = comment.trim();

    // Same rules as the server: a reason is required to reject or to post a comment
    if ((action !== "APPROVED" || text) && text.length < COMMENT_MIN) {
      setError(
        action === "REJECTED"
          ? `Add a reason (at least ${COMMENT_MIN} characters) so the student knows what to fix.`
          : `Comment must be at least ${COMMENT_MIN} characters.`
      );
      document.getElementById("review-comment")?.focus();
      return;
    }

    inFlight.current = true;
    setBusy(action);
    setError("");
    try {
      if (action === "COMMENT") {
        await submissionsApi.addFeedback(submission.id, text);
        setComment("");
        showToast("Feedback posted", "success");
        onDone(false);
      } else {
        await submissionsApi.review(submission.id, { status: action, comment: text || undefined });
        showToast(action === "APPROVED" ? "Submission approved" : "Submission rejected", "success");
        onDone(true);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Another reviewer got there first — show their decision instead
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

  return (
    <>
      <Separator />
      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="review-comment">
            {isPending ? "Your review" : "Add a comment"}
          </Label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setError("");
            }}
            placeholder={
              isPending
                ? "Optional when approving, required when rejecting. What went well? What should be fixed?"
                : "Leave additional feedback for the student…"
            }
            maxLength={COMMENT_MAX}
            rows={4}
            aria-invalid={error ? true : undefined}
          />
        </div>
        <FormBanner message={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy !== null} onClick={() => run("COMMENT")}>
            {busy === "COMMENT" && <Spinner className="size-4 text-current" />}
            Post comment
          </Button>
          {isPending && (
            <>
              <Button variant="destructive" disabled={busy !== null} onClick={() => run("REJECTED")}>
                {busy === "REJECTED" && <Spinner className="size-4 text-current" />}
                Reject
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-600/85"
                disabled={busy !== null}
                onClick={() => run("APPROVED")}
              >
                {busy === "APPROVED" && <Spinner className="size-4 text-current" />}
                Approve
              </Button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
