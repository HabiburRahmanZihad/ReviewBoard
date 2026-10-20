"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { submissionsApi } from "@/lib/api";
import { Submission, SubmissionStatus, StatsResponse, PaginationInfo } from "@/types";
import { confirmAction, showSuccess, showError, showToast } from "@/lib/alerts";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusColors: Record<SubmissionStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function MentorDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Submissions & Pagination state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Stats
  const [stats, setStats] = useState<StatsResponse["stats"] | null>(null);

  // Dialogs
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [actionError, setActionError] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await submissionsApi.getStats();
      if (res.data) {
        setStats(res.data.stats);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch submissions list
  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    setActionError("");
    try {
      const res = await submissionsApi.list({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter === "ALL" ? undefined : (statusFilter as SubmissionStatus),
        search: debouncedSearch.trim() || undefined,
      });
      if (res.data) {
        setSubmissions(res.data.submissions);
        setPagination(res.data.pagination);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setActionError(errorObj.message || "Failed to load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, debouncedSearch]);

  // Auth Guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "MENTOR") {
      router.replace("/submissions");
      return;
    }
    fetchStats();
    fetchSubmissions();
  }, [user, authLoading, router, fetchStats, fetchSubmissions]);

  // Handle status update
  const handleStatusUpdate = async (id: string, status: "APPROVED" | "REJECTED") => {
    const isApprove = status === "APPROVED";
    const confirmed = await confirmAction({
      title: `${isApprove ? "Approve" : "Reject"} Submission?`,
      text: `Are you sure you want to mark this submission as ${status}?`,
      icon: isApprove ? "question" : "warning",
      confirmButtonText: isApprove ? "Yes, approve" : "Yes, reject",
      confirmButtonColor: isApprove ? "#10b981" : "#ef4444",
    });

    if (!confirmed) return;

    try {
      await submissionsApi.updateStatus(id, status);
      await fetchSubmissions();
      await fetchStats();
      showToast(`Submission marked as ${status.toLowerCase()}`, "success");
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showError("Status Update Failed", errorObj.message || "Failed to update status.");
    }
  };

  // Handle feedback modal open
  const openFeedbackModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setFeedbackComment("");
    setFeedbackDialogOpen(true);
  };

  // Submit feedback
  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setIsSubmittingFeedback(true);
    try {
      await submissionsApi.addFeedback(selectedSubmission.id, feedbackComment);
      setFeedbackDialogOpen(false);
      setFeedbackComment("");
      await fetchSubmissions();
      showSuccess("Feedback Added", "Your review comment has been attached to this submission.");
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showError("Feedback Submission Failed", errorObj.message || "Failed to add feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mentor Review Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Review student submissions, provide constructive feedback, and assess progress.
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
                <span className="text-xl">⏳</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{stats.totalPending}</div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
                <span className="text-xl">✅</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{stats.totalApproved}</div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
                <span className="text-xl">❌</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.totalRejected}</div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                <span className="text-xl">📋</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border border-border/50">
          <div className="flex flex-1 w-full sm:w-auto items-center gap-3">
            <Input
              placeholder="Search by project name, student, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md h-10"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Filter Status:</span>
            <Select
              value={statusFilter}
              onValueChange={(val: string | null) => {
                setStatusFilter(val || "ALL");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {actionError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {actionError}
          </div>
        )}

        {/* Submissions Table */}
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Project & Student</TableHead>
                  <TableHead className="min-w-[240px]">Description</TableHead>
                  <TableHead className="w-[150px]">Links</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[130px]">Submitted</TableHead>
                  <TableHead className="text-right w-[240px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-muted-foreground text-sm">Loading submissions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No submissions found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="align-top font-medium">
                        <div className="font-semibold text-foreground">{sub.projectName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{sub.student.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{sub.student.email}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm line-clamp-2 text-muted-foreground">{sub.description}</p>
                        {sub.feedbacks && sub.feedbacks.length > 0 && (
                          <div className="mt-2 text-xs bg-muted/40 p-2 rounded border border-border/40">
                            <span className="font-semibold text-foreground">Latest Feedback: </span>
                            <span className="text-muted-foreground">{sub.feedbacks[0].comment}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top space-y-1 text-xs">
                        <div>
                          <a
                            href={sub.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            📦 GitHub
                          </a>
                        </div>
                        {sub.liveUrl && (
                          <div>
                            <a
                              href={sub.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              🌐 Live Demo
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={statusColors[sub.status]}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="align-top text-right space-x-2">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {sub.status !== "APPROVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                              onClick={() => handleStatusUpdate(sub.id, "APPROVED")}
                            >
                              Approve
                            </Button>
                          )}
                          {sub.status !== "REJECTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleStatusUpdate(sub.id, "REJECTED")}
                            >
                              Reject
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs"
                            onClick={() => openFeedbackModal(sub)}
                          >
                            Feedback
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
              <span className="text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Provide Review Feedback</DialogTitle>
              <DialogDescription>
                Project: <span className="font-semibold text-foreground">{selectedSubmission?.projectName}</span> by{" "}
                {selectedSubmission?.student.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFeedback} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Textarea
                  placeholder="Detail your code review feedback, suggestions for improvement, or praise..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFeedbackDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingFeedback}>
                  {isSubmittingFeedback ? "Submitting..." : "Post Feedback"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
