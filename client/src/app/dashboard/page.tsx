import { Suspense } from "react";
import { FullPageSpinner } from "@/components/spinner";
import { DashboardView } from "./dashboard-view";

// The dashboard keeps its filters in the URL (?status=…&page=…&q=…), which it
// reads with useSearchParams — so it must sit inside a Suspense boundary.
export default function DashboardPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DashboardView />
    </Suspense>
  );
}
