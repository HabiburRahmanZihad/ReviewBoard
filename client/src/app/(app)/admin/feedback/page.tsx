import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/spinner";
import { FeedbackView } from "./feedback-view";

export const metadata: Metadata = { title: "Feedback" };

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <FeedbackView />
    </Suspense>
  );
}
