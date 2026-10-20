import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/require-role";
import { PageLoading } from "@/components/spinner";
import { PageHeader } from "@/components/page-header";
import { SubmissionsBoard } from "@/components/submissions-board";

export const metadata: Metadata = { title: "All submissions" };

// UX guard only — every /api/admin route independently requires the ADMIN role.
export default function AdminSubmissionsPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Administration"
          title="Submissions"
          description="Every project on the platform. Review it, change a decision, or remove it."
        />
        {/* Filters live in the URL (useSearchParams), which needs a Suspense boundary */}
        <Suspense fallback={<PageLoading />}>
          <SubmissionsBoard mode="admin" />
        </Suspense>
      </div>
    </RequireRole>
  );
}
