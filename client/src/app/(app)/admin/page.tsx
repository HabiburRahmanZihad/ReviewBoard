import type { Metadata } from "next";
import { RequireRole } from "@/components/require-role";
import { OverviewView } from "./overview-view";

export const metadata: Metadata = { title: "Admin overview" };

// UX guard only — every /api/admin route independently requires the ADMIN role.
export default function AdminOverviewPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <OverviewView />
    </RequireRole>
  );
}
