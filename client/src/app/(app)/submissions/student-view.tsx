"use client";

import { useCallback, useState } from "react";
import { ArrowRight, FolderGit2, Plus, RotateCcw } from "lucide-react";
import { submissionsApi } from "@/lib/api";
import { isStudent } from "@/lib/roles";
import { formatDateTime, formatRelative, hostOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "@/hooks/use-query";
import { Submission, SubmissionStatus } from "@/types";
import { RequireRole } from "@/components/require-role";
import { PageLoading } from "@/components/spinner";
import { PageHeader } from "@/components/page-header";
import { PipelineBar } from "@/components/pipeline-bar";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { RepoSlug } from "@/components/repo-slug";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Pagination } from "@/components/pagination";
import { SubmissionFormDialog } from "@/components/submission-form-dialog";
import { SubmissionSheet } from "@/components/submission-sheet";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 8;

export function StudentView() {
  return (
    <RequireRole allow={isStudent} fallback={<PageLoading />}>
      <StudentPortal />
    </RequireRole>
  );
}

function StudentPortal() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SubmissionStatus | undefined>();

  const fetchStats = useCallback(async (signal: AbortSignal) => (await submissionsApi.getStats(signal)).data!.stats, []);
  const stats = useQuery(fetchStats);

  const fetchList = useCallback(
    async (signal: AbortSignal) => (await submissionsApi.list({ page, limit: PAGE_SIZE, status }, signal)).data!,
    [page, status]
  );
  const list = useQuery(fetchList);

  const { refetch: refetchList } = list;
  const { refetch: refetchStats } = stats;
  const refreshAll = useCallback(() => {
    refetchList();
    refetchStats();
  }, [refetchList, refetchStats]);

  // New submission / resubmission form
  const [formOpen, setFormOpen] = useState(false);
  const [resubmitting, setResubmitting] = useState<Submission | null>(null);

  // Review sheet — the selection is kept while it animates closed
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openNew = () => {
    setResubmitting(null);
    setFormOpen(true);
  };
  const openResubmit = (submission: Submission) => {
    setSheetOpen(false);
    setResubmitting(submission);
    setFormOpen(true);
  };
  const openSheet = (submission: Submission) => {
    setViewing(submission);
    setSheetOpen(true);
  };
  const filterBy = (next?: SubmissionStatus) => {
    setStatus(next);
    setPage(1);
  };

  const handleSaved = () => {
    // New and resubmitted work shows up under "All" on the first page
    setStatus(undefined);
    if (page !== 1) setPage(1);
    refreshAll();
  };

  const counts = stats.data && {
    pending: stats.data.totalPending,
    approved: stats.data.totalApproved,
    rejected: stats.data.totalRejected,
  };
  const submissions = list.data?.submissions ?? [];
  const hasAny = (stats.data?.totalSubmissions ?? 0) > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student"
        title="My submissions"
        description="Submit projects for review and follow every comment and decision."
        actions={
          <Button size="lg" onClick={openNew}>
            <Plus data-icon="inline-start" />
            New submission
          </Button>
        }
      />

      {hasAny && <PipelineBar title="Your submissions" counts={counts} active={status} onSelect={filterBy} />}

      {list.error && <ErrorBanner message={list.error} onRetry={refreshAll} />}

      <div className="overflow-hidden rounded-xl border bg-card">
        {!list.data && list.isLoading ? (
          <ul className="divide-y">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="px-5 py-5">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="mt-2.5 h-3 w-72 animate-pulse rounded bg-muted/70" />
              </li>
            ))}
          </ul>
        ) : list.data && submissions.length === 0 ? (
          status ? (
            <EmptyState
              title={`No ${statusLabel[status].toLowerCase()} submissions`}
              action={
                <Button variant="outline" size="sm" onClick={() => filterBy(undefined)}>
                  Show all submissions
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderGit2}
              title="Submit your first project"
              description="Add your GitHub repository and live link. A mentor will review it and leave feedback here."
              action={
                <Button onClick={openNew}>
                  <Plus data-icon="inline-start" />
                  New submission
                </Button>
              }
            />
          )
        ) : (
          <ul className={cn("divide-y transition-opacity", list.isLoading && "opacity-60")}>
            {submissions.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                onOpen={() => openSheet(submission)}
                onResubmit={() => openResubmit(submission)}
              />
            ))}
          </ul>
        )}
        {list.data && list.data.pagination.totalPages > 1 && (
          <div className="border-t px-5 py-3">
            <Pagination pagination={list.data.pagination} onPageChange={setPage} disabled={list.isLoading} />
          </div>
        )}
      </div>

      <SubmissionFormDialog open={formOpen} onOpenChange={setFormOpen} resubmitting={resubmitting} onSaved={handleSaved} />
      <SubmissionSheet
        submission={viewing}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="student"
        onResubmit={openResubmit}
      />
    </div>
  );
}

function SubmissionRow({
  submission,
  onOpen,
  onResubmit,
}: {
  submission: Submission;
  onOpen: () => void;
  onResubmit: () => void;
}) {
  const latest = submission.feedbacks?.[0];
  const comments = submission._count?.feedbacks ?? 0;

  return (
    <li className="relative flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Stretched button: the whole row opens the submission, and it stays keyboard-reachable */}
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 truncate text-left text-[15px] font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
          >
            {submission.projectName}
          </button>
          <StatusBadge status={submission.status} />
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <RepoSlug repoUrl={submission.repoUrl} className="relative z-10" />
          {submission.liveUrl && (
            <>
              <span aria-hidden>·</span>
              <a
                href={submission.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 truncate font-mono text-[12.5px] underline-offset-4 hover:text-foreground hover:underline"
              >
                {hostOf(submission.liveUrl)}
              </a>
            </>
          )}
          <span aria-hidden>·</span>
          <time dateTime={submission.createdAt} title={formatDateTime(submission.createdAt)}>
            Submitted {formatRelative(submission.createdAt)}
          </time>
        </div>
        {latest && (
          <p className="mt-2.5 line-clamp-2 border-l-2 pl-3 text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{latest.mentor?.name ?? "Mentor"}:</span> {latest.comment}
          </p>
        )}
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-2">
        {submission.status === "REJECTED" && (
          <Button size="sm" onClick={onResubmit}>
            <RotateCcw data-icon="inline-start" />
            Resubmit
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onOpen}>
          {comments > 0 ? `${comments} comment${comments === 1 ? "" : "s"}` : "Details"}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </li>
  );
}
