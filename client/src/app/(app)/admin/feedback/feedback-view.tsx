"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, Trash } from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
import { confirmAction, showToast } from "@/lib/alerts";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "@/hooks/use-query";
import { useUrlParams } from "@/hooks/use-url-params";
import { FeedbackWithSubmission, Submission } from "@/types";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusDot } from "@/components/status-badge";
import { RepoSlug } from "@/components/repo-slug";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Pagination } from "@/components/pagination";
import { SubmissionSheet } from "@/components/submission-sheet";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

export function FeedbackView() {
  const { page, query, update } = useUrlParams();

  const fetchFeedback = useCallback(
    async (signal: AbortSignal) =>
      (await adminApi.listFeedback({ page, limit: PAGE_SIZE, search: query || undefined }, signal)).data!,
    [page, query]
  );
  const feedback = useQuery(fetchFeedback);

  const totalPages = feedback.data?.pagination.totalPages;
  useEffect(() => {
    if (!feedback.isLoading && totalPages && page > totalPages) update({ page: totalPages > 1 ? String(totalPages) : undefined });
  }, [feedback.isLoading, totalPages, page, update]);

  const [selected, setSelected] = useState<Submission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const open = (submission: Submission) => {
    setSelected(submission);
    setSheetOpen(true);
  };

  const remove = async (item: FeedbackWithSubmission) => {
    const confirmed = await confirmAction({
      title: "Delete this comment?",
      description: `${item.mentor?.name ?? "A former mentor"}'s comment on “${item.submission.projectName}” will be removed and the student will no longer see it.`,
      confirmLabel: "Delete comment",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await adminApi.deleteFeedback(item.id);
      showToast("Comment deleted");
      feedback.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const commitSearch = useCallback((q: string) => update({ q: q || undefined, page: undefined }), [update]);
  const items = feedback.data?.feedback ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Feedback"
        description="Every comment reviewers have left. Open the submission for context, or remove a comment."
      />

      <div className="space-y-5">
        <SearchInput value={query} onCommit={commitSearch} placeholder="Search comments, projects or reviewers" className="sm:max-w-sm" />

        {feedback.error && <ErrorBanner message={feedback.error} onRetry={feedback.refetch} />}

        <div className="overflow-hidden rounded-xl border bg-card">
          {!feedback.data && feedback.isLoading ? (
            <ul className="divide-y">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="px-5 py-5">
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-muted/70" />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title={query ? "No comments match your search" : "No feedback yet"}
              description={query ? "Try another word, project or reviewer name." : "Comments appear here as reviewers write them."}
            />
          ) : (
            <ul className={cn("divide-y transition-opacity", feedback.isLoading && "opacity-60")}>
              {items.map((item) => (
                <li key={item.id} className="group flex gap-4 px-5 py-4">
                  <UserAvatar name={item.mentor?.name ?? "?"} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
                      <span className="font-medium text-foreground">{item.mentor?.name ?? "Former mentor"}</span>
                      <span>on</span>
                      <button
                        type="button"
                        onClick={() => open(item.submission)}
                        className="inline-flex items-center gap-1.5 rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        <StatusDot status={item.submission.status} />
                        {item.submission.projectName}
                      </button>
                      <span aria-hidden>·</span>
                      <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
                        {formatRelative(item.createdAt)}
                      </time>
                    </p>
                    <p className="mt-1.5 line-clamp-3 text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word">{item.comment}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <RepoSlug repoUrl={item.submission.repoUrl} className="text-xs" />
                      <span aria-hidden>·</span>
                      <span>by {item.submission.student.name}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(item)}
                      aria-label={`Delete comment by ${item.mentor?.name ?? "former mentor"}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {feedback.data && feedback.data.pagination.totalCount > 0 && (
            <div className="border-t px-5 py-3">
              <Pagination
                pagination={feedback.data.pagination}
                onPageChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
                disabled={feedback.isLoading}
              />
            </div>
          )}
        </div>
      </div>

      <SubmissionSheet
        submission={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="admin"
        onChanged={feedback.refetch}
      />
    </div>
  );
}
