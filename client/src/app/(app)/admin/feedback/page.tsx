import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/require-role";
import { PageLoading } from "@/components/spinner";
import { FeedbackView } from "./feedback-view";

export const metadata: Metadata = { title: "Feedback" };

// UX guard only — every /api/admin route independently requires the ADMIN role.
export default function AdminFeedbackPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Suspense fallback={<PageLoading />}>
        <FeedbackView />
      </Suspense>
    </RequireRole>
  );
}
