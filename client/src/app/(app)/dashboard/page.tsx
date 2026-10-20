import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/spinner";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Review queue" };

// Filters live in the URL and are read with useSearchParams, which needs a Suspense boundary.
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardView />
    </Suspense>
  );
}
