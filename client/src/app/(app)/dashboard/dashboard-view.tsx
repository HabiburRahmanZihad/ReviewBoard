"use client";

import { useAuth } from "@/hooks/use-auth";
import { isAdmin, isReviewer } from "@/lib/roles";
import { RequireRole } from "@/components/require-role";
import { PageLoading } from "@/components/spinner";
import { PageHeader } from "@/components/page-header";
import { SubmissionsBoard } from "@/components/submissions-board";

export function DashboardView() {
  const { user } = useAuth();
  return (
    <RequireRole allow={isReviewer} fallback={<PageLoading />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Mentor"
          title="Review queue"
          description="Open a submission to read it, leave feedback, and approve or reject it."
        />
        <SubmissionsBoard mode={user && isAdmin(user.role) ? "admin" : "reviewer"} />
      </div>
    </RequireRole>
  );
}
