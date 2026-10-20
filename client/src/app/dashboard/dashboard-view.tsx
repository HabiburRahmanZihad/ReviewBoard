"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, Clock, FolderGit2, Globe, Inbox, Layers, Search } from "lucide-react";
import { submissionsApi } from "@/lib/api";
import { isReviewer } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "@/hooks/use-query";
import { Stats, Submission, SubmissionStatus } from "@/types";
import { Navbar } from "@/components/navbar";
import { RequireRole } from "@/components/require-role";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { Spinner } from "@/components/spinner";
import { SubmissionDetailsDialog } from "@/components/submission-details-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 10;
const STATUSES: SubmissionStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const FILTERS: {
  status?: SubmissionStatus;
  label: string;
  stat: keyof Stats;
  Icon: typeof Clock;
  tone: string;
}[] = [
  { status: "PENDING", label: "Pending review", stat: "totalPending", Icon: Clock, tone: "text-amber-400" },
  { status: "APPROVED", label: "Approved", stat: "totalApproved", Icon: CircleCheck, tone: "text-emerald-400" },
  { status: "REJECTED", label: "Rejected", stat: "totalRejected", Icon: CircleX, tone: "text-red-400" },
  { status: undefined, label: "All submissions", stat: "totalSubmissions", Icon: Layers, tone: "text-foreground" },
];

const parseStatus = (value: string | null): SubmissionStatus | undefined =>
  STATUSES.find((s) => s === value?.toUpperCase());

const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export function DashboardView() {
  return (
    <RequireRole allow={isReviewer}>
      <MentorDashboard />
    </RequireRole>
  );
}

function MentorDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filters live in the URL so they survive reloads and can be shared as links
  const status = parseStatus(searchParams.get("status"));
  const page = parsePage(searchParams.get("page"));
  const query = searchParams.get("q")?.trim() ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Debounce typing into the URL; any new search starts again from page 1
  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => {
    const value = searchInput.trim();
    if (value === query) return;
    const timer = setTimeout(() => updateParams({ q: value || undefined, page: undefined }), 350);
    return () => clearTimeout(timer);
  }, [searchInput, query, updateParams]);

  // ─── Data ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(
    async (signal: AbortSignal) => (await submissionsApi.getStats(signal)).data!.stats,
    []
  );
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

  // After an approval empties the last page of a filtered view, step back a page
  const totalPages = list.data?.pagination.totalPages;
  useEffect(() => {
    if (!list.isLoading && totalPages && page > totalPages) {
      updateParams({ page: totalPages > 1 ? String(totalPages) : undefined });
    }
  }, [list.isLoading, totalPages, page, updateParams]);

  // ─── Details / review dialog ──────────────────────────────────────────
  const [selected, setSelected] = useState<Submission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const openReview = (submission: Submission) => {
    setSelected(submission);
    setDialogOpen(true);
  };

  const setStatus = (next?: SubmissionStatus) => updateParams({ status: next, page: undefined });
  const hasFilters = Boolean(status || query);
  const clearFilters = () => {
    setSearchInput("");
    updateParams({ status: undefined, q: undefined, page: undefined });
  };

  const submissions = list.data?.submissions ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Review student submissions, leave feedback, and approve or reject projects.
          </p>
        </div>

        {/* Aggregated statistics — each card doubles as a filter */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {FILTERS.map(({ status: value, label, stat, Icon, tone }) => {
            const active = status === value;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStatus(value)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "border-primary/60 ring-1 ring-primary/40" : "border-border/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Icon className={cn("size-4", tone)} />
                </div>
                <div className={cn("mt-2 text-2xl font-bold tabular-nums", tone)}>
                  {stats.data ? stats.data[stat] : stats.error ? "–" : <Spinner className="size-5 mt-1" />}
                </div>
                {stat === "totalSubmissions" && stats.data && (
                  <p className="mt-1 text-xs text-muted-foreground">from {stats.data.totalStudents} students</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search project, student or email…"
              aria-label="Search submissions"
              className="h-9 pl-8"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-3">
            {list.isLoading && list.data && <Spinner className="size-4" />}
            <div className="inline-flex rounded-lg border border-border/60 p-0.5" role="group" aria-label="Filter by status">
              {[undefined, ...STATUSES].map((value) => (
                <button
                  key={value ?? "ALL"}
                  type="button"
                  onClick={() => setStatus(value)}
                  aria-pressed={status === value}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm transition-colors",
                    status === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {value ? value.charAt(0) + value.slice(1).toLowerCase() : "All"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(list.error || stats.error) && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {list.error || stats.error}
            <Button variant="outline" size="sm" onClick={refreshAll}>
              Retry
            </Button>
          </div>
        )}

        {/* Submissions table */}
        <Card className="border-border/50 py-0 gap-0 overflow-hidden">
          <div className={cn("overflow-x-auto transition-opacity", list.isLoading && list.data && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px] pl-4">Project</TableHead>
                  <TableHead className="min-w-[180px]">Student</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!list.data && list.isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-4">
                        <div className="h-9 animate-pulse rounded bg-muted/40" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="size-8" />
                        <p>{hasFilters ? "No submissions match these filters." : "No submissions yet."}</p>
                        {hasFilters && (
                          <Button variant="outline" size="sm" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((sub) => (
                    <TableRow key={sub.id} className="cursor-pointer" onClick={() => openReview(sub)}>
                      <TableCell className="pl-4 max-w-[320px]">
                        <div className="font-medium truncate">{sub.projectName}</div>
                        <div className="text-xs text-muted-foreground truncate">{sub.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="truncate">{sub.student.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{sub.student.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={sub.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open repository"
                            aria-label={`Open ${sub.projectName} repository`}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <FolderGit2 className="size-4" />
                          </a>
                          {sub.liveUrl && (
                            <a
                              href={sub.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open live site"
                              aria-label={`Open ${sub.projectName} live site`}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Globe className="size-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
                        {sub.reviewer && (
                          <div className="mt-1 text-xs text-muted-foreground">by {sub.reviewer.name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(sub.createdAt)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          size="sm"
                          variant={sub.status === "PENDING" ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            openReview(sub);
                          }}
                        >
                          {sub.status === "PENDING" ? "Review" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {list.data && (
            <div className="border-t border-border/50 px-4 py-3">
              <Pagination
                pagination={list.data.pagination}
                onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : undefined })}
                disabled={list.isLoading}
              />
            </div>
          )}
        </Card>
      </main>

      <SubmissionDetailsDialog
        submission={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        canReview
        onChanged={refreshAll}
      />
    </div>
  );
}
