"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { submissionsApi } from "@/lib/api";
import { Submission, SubmissionStatus, ApiResponse } from "@/types";
import { showSuccess, showError, confirmAction } from "@/lib/alerts";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const statusColors: Record<SubmissionStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function SubmissionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await submissionsApi.list({ limit: 50 });
      if (res.data) {
        setSubmissions(res.data.submissions);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "STUDENT") {
      router.replace("/dashboard");
      return;
    }
    fetchSubmissions();
  }, [user, authLoading, router, fetchSubmissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const confirmed = await confirmAction({
      title: "Submit Project?",
      text: `Are you ready to submit "${projectName}" for mentor review?`,
      icon: "question",
      confirmButtonText: "Yes, submit",
      confirmButtonColor: "#3b82f6",
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      await submissionsApi.create({
        projectName,
        repoUrl,
        liveUrl: liveUrl || undefined,
        description,
      });
      setDialogOpen(false);
      setProjectName("");
      setRepoUrl("");
      setLiveUrl("");
      setDescription("");
      fetchSubmissions();
      await showSuccess(
        "Project Submitted!",
        "Your project has been queued for review by a mentor."
      );
    } catch (err: unknown) {
      const apiErr = err as ApiResponse;
      const msg = apiErr.message || "Failed to submit project.";
      setFormError(msg);
      await showError("Submission Error", msg);
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Submissions</h2>
            <p className="text-muted-foreground mt-1">
              Submit and track your project reviews
            </p>
          </div>

          <Button size="lg" className="font-medium" onClick={() => setDialogOpen(true)}>
            + New Submission
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit a Project</DialogTitle>
                <DialogDescription>
                  Fill in your project details for review by a mentor.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                {formError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {formError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repoUrl">Repository URL *</Label>
                  <Input
                    id="repoUrl"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    required
                    type="url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liveUrl">Live URL (optional)</Label>
                  <Input
                    id="liveUrl"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://my-project.vercel.app"
                    type="url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project, technologies used, and key features..."
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Project"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Submissions Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : submissions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-5xl mb-4">📂</div>
              <h3 className="text-lg font-semibold mb-1">No submissions yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Submit your first project to get started
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                + New Submission
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {submissions.map((submission) => (
              <Card
                key={submission.id}
                className="group hover:shadow-lg transition-all duration-200 border-border/50"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">
                      {submission.projectName}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={statusColors[submission.status]}
                    >
                      {submission.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1">
                    {submission.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5 text-sm">
                    <a
                      href={submission.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <span>📦</span>
                      <span className="truncate underline-offset-2 hover:underline">
                        {submission.repoUrl.replace("https://github.com/", "")}
                      </span>
                    </a>
                    {submission.liveUrl && (
                      <a
                        href={submission.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <span>🌐</span>
                        <span className="truncate underline-offset-2 hover:underline">
                          {submission.liveUrl.replace(/^https?:\/\//, "")}
                        </span>
                      </a>
                    )}
                  </div>

                  {submission.reviewer && (
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                      Reviewed by {submission.reviewer.name}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Submitted {new Date(submission.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
