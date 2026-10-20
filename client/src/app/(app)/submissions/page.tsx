"use client";

import { useCallback, useState } from "react";
import { FolderGit2, Globe, Inbox, MessageSquareText, Plus, RotateCcw } from "lucide-react";
import { submissionsApi } from "@/lib/api";
import { isStudent } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { useQuery } from "@/hooks/use-query";
import { Submission } from "@/types";
import { Navbar } from "@/components/navbar";
import { RequireRole } from "@/components/require-role";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { SubmissionFormDialog } from "@/components/submission-form-dialog";
import { SubmissionDetailsDialog } from "@/components/submission-details-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const PAGE_SIZE = 9;

export default function SubmissionsPage() {
  return (
    <RequireRole allow={isStudent}>
      <StudentPortal />
    </RequireRole>
  );
}

function StudentPortal() {
  const [page, setPage] = useState(1);

  const fetchList = useCallback(
    async (signal: AbortSignal) => (await submissionsApi.list({ page, limit: PAGE_SIZE }, signal)).data!,
    [page]
  );
  const list = useQuery(fetchList);
  const { refetch } = list;

  // Form dialog (new submission or resubmission of a rejected one)
  const [formOpen, setFormOpen] = useState(false);
  const [resubmitting, setResubmitting] = useState<Submission | null>(null);

  // Details dialog — the selection is kept while it animates closed
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openNew = () => {
    setResubmitting(null);
    setFormOpen(true);
  };

  const openResubmit = (submission: Submission) => {
    setDetailsOpen(false);
    setResubmitting(submission);
    setFormOpen(true);
  };

  const openDetails = (submission: Submission) => {
    setViewing(submission);
    setDetailsOpen(true);
  };

  const handleSaved = () => {
    // New submissions appear first, so jump to page 1
    if (page !== 1) setPage(1);
    else refetch();
  };

  const submissions = list.data?.submissions ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Submissions</h2>
            <p className="text-muted-foreground mt-1">Submit your projects and track their review status.</p>
          </div>
          <Button size="lg" onClick={openNew}>
            <Plus data-icon="inline-start" />
            New submission
          </Button>
        </div>

        {list.error && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {list.error}
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        )}

        {!list.data && list.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : list.data && submissions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="size-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No submissions yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Submit your first project to get mentor feedback.</p>
              <Button onClick={openNew}>
                <Plus data-icon="inline-start" />
                New submission
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={list.isLoading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onView={() => openDetails(submission)}
                  onResubmit={() => openResubmit(submission)}
                />
              ))}
            </div>
            {list.data && (
              <div className="mt-6">
                <Pagination pagination={list.data.pagination} onPageChange={setPage} disabled={list.isLoading} />
              </div>
            )}
          </div>
        )}
      </main>

      <SubmissionFormDialog open={formOpen} onOpenChange={setFormOpen} resubmitting={resubmitting} onSaved={handleSaved} />
      <SubmissionDetailsDialog
        submission={viewing}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        canReview={false}
        onResubmit={openResubmit}
      />
    </div>
  );
}

function SubmissionCard({
  submission,
  onView,
  onResubmit,
}: {
  submission: Submission;
  onView: () => void;
  onResubmit: () => void;
}) {
  const latestFeedback = submission.feedbacks?.[0];
  const feedbackCount = submission._count?.feedbacks ?? 0;

  return (
    <Card className="flex flex-col border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug wrap-break-word">{submission.projectName}</CardTitle>
          <StatusBadge status={submission.status} />
        </div>
        <CardDescription className="line-clamp-2">{submission.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        <div className="space-y-1.5">
          <a
            href={submission.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <FolderGit2 className="size-4 shrink-0" />
            <span className="truncate">{submission.repoUrl.replace(/^https:\/\/github\.com\//, "")}</span>
          </a>
          {submission.liveUrl && (
            <a
              href={submission.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="size-4 shrink-0" />
              <span className="truncate">{submission.liveUrl.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>

        {latestFeedback && (
          <div className="rounded-md border border-border/50 bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium mb-1">
              <MessageSquareText className="size-3.5" />
              {latestFeedback.mentor?.name ?? "Mentor"}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{latestFeedback.comment}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Submitted {formatDate(submission.createdAt)}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onView}>
            {feedbackCount > 0 ? `Feedback (${feedbackCount})` : "Details"}
          </Button>
          {submission.status === "REJECTED" && (
            <Button size="sm" onClick={onResubmit}>
              <RotateCcw data-icon="inline-start" />
              Resubmit
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
