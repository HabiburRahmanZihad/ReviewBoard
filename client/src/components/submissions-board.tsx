"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { submissionsApi } from "@/lib/api";
import { daysSince, formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "@/hooks/use-query";
import { useUrlParams } from "@/hooks/use-url-params";
import { Submission, SubmissionStatus } from "@/types";
import { PipelineBar } from "@/components/pipeline-bar";
import { SearchInput } from "@/components/search-input";
import { FilterTabs } from "@/components/filter-tabs";
import { StatusBadge } from "@/components/status-badge";
import { RepoSlug } from "@/components/repo-slug";
import { UserCell } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Pagination } from "@/components/pagination";
import { SubmissionSheet } from "@/components/submission-sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 10;
const STATUSES: SubmissionStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const parseStatus = (value: string | null) => STATUSES.find((s) => s === value?.toUpperCase());

/**
 * The review table used by both the mentor queue and the admin submissions
 * page: pipeline summary, search, server-side status filter, pagination and
 * the review sheet. Filters live in the URL.
 */
export function SubmissionsBoard({ mode }: { mode: "reviewer" | "admin" }) {
  const { searchParams, page, query, update } = useUrlParams();
  const status = parseStatus(searchParams.get("status"));

  const fetchStats = useCallback(async (signal: AbortSignal) => (await submissionsApi.getStats(signal)).data!.stats, []);
  const stats = useQuery(fetchStats);

  const fetchList = useCallback(
    async (signal: AbortSignal) =>
      (await submissionsApi.list({ page, limit: PAGE_SIZE, status, search: query || undefined }, signal)).data!,
    [page, status, query]
  );
  const list = useQuery(fetchList);

  const { refetch: refetchList } = list;
  const { refetch: refetchStats } = stats;
  const refreshAll = useCallback(() => {
    refetchList();
    refetchStats();
  }, [refetchList, refetchStats]);

  // After a decision empties the last page of a filtered view, step back a page
  const totalPages = list.data?.pagination.totalPages;
  useEffect(() => {
    if (!list.isLoading && totalPages && page > totalPages) {
      update({ page: totalPages > 1 ? String(totalPages) : undefined });
    }
  }, [list.isLoading, totalPages, page, update]);

  const [selected, setSelected] = useState<Submission | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const open = (submission: Submission) => {
    setSelected(submission);
    setSheetOpen(true);
  };

  const setStatus = (next?: SubmissionStatus) => update({ status: next?.toLowerCase(), page: undefined });
  const commitSearch = useCallback((q: string) => update({ q: q || undefined, page: undefined }), [update]);
  const hasFilters = Boolean(status || query);

  const counts = stats.data && {
    pending: stats.data.totalPending,
    approved: stats.data.totalApproved,
    rejected: stats.data.totalRejected,
  };
  const submissions = list.data?.submissions ?? [];

  return (
    <div className="space-y-5">
      <PipelineBar counts={counts} active={status} onSelect={setStatus} error={stats.error} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onCommit={commitSearch} placeholder="Search project, student or email" />
        <FilterTabs
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: undefined, label: "All", count: stats.data?.totalSubmissions },
            { value: "PENDING", label: "Pending", count: counts?.pending },
            { value: "APPROVED", label: "Approved", count: counts?.approved },
            { value: "REJECTED", label: "Rejected", count: counts?.rejected },
          ]}
        />
      </div>

      {list.error && <ErrorBanner message={list.error} onRetry={refreshAll} />}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className={cn("overflow-x-auto transition-opacity", list.isLoading && list.data && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="hidden sm:table-cell">Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Submitted</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Feedback</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!list.data && list.isLoading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell colSpan={6}>
                      <div className="h-9 animate-pulse rounded-md bg-muted/60" />
                    </TableCell>
                  </TableRow>
                ))
              ) : submissions.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="whitespace-normal">
                    {hasFilters ? (
                      <EmptyState
                        title="No submissions match these filters"
                        description="Try a different status or search term."
                        action={
                          <Button variant="outline" size="sm" onClick={() => update({ status: undefined, q: undefined, page: undefined })}>
                            Clear filters
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState title="No submissions yet" description="Projects appear here as soon as students submit them." />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id} className="cursor-pointer" onClick={() => open(sub)}>
                    <TableCell className="max-w-48 sm:max-w-80">
                      {/* A real button, so the row is reachable by keyboard and screen readers at every size */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          open(sub);
                        }}
                        className="block max-w-full truncate rounded-sm text-left font-medium underline-offset-4 hover:underline"
                      >
                        {sub.projectName}
                      </button>
                      <RepoSlug repoUrl={sub.repoUrl} className="max-w-full" />
                      {/* On phones the student column is hidden, so name them here */}
                      <div className="truncate text-xs text-muted-foreground sm:hidden">{sub.student.name}</div>
                    </TableCell>
                    <TableCell className="hidden max-w-64 sm:table-cell">
                      <UserCell name={sub.student.name} detail={sub.student.email} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sub.status} />
                      <div className="mt-1 text-xs text-muted-foreground">
                        {sub.status === "PENDING"
                          ? waitingLabel(sub.updatedAt)
                          : sub.reviewer
                            ? `by ${sub.reviewer.name}`
                            : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      <time dateTime={sub.createdAt} title={formatDateTime(sub.createdAt)}>
                        {formatRelative(sub.createdAt)}
                      </time>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="size-3.5" aria-hidden />
                        {sub._count?.feedbacks ?? 0}
                        <span className="sr-only">comments</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <Button
                        size="sm"
                        variant={sub.status === "PENDING" ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          open(sub);
                        }}
                      >
                        {sub.status === "PENDING" ? "Review" : "Open"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {list.data && list.data.pagination.totalCount > 0 && (
          <div className="border-t px-5 py-3">
            <Pagination
              pagination={list.data.pagination}
              onPageChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
              disabled={list.isLoading}
            />
          </div>
        )}
      </div>

      <SubmissionSheet
        submission={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={mode}
        onChanged={refreshAll}
      />
    </div>
  );
}

function waitingLabel(since: string) {
  const days = daysSince(since);
  return days < 1 ? "Waiting since today" : `Waiting ${days} day${days === 1 ? "" : "s"}`;
}
