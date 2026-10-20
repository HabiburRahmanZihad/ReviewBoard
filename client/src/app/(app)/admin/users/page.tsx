import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/require-role";
import { PageLoading } from "@/components/spinner";
import { UsersView } from "./users-view";

export const metadata: Metadata = { title: "Users" };

// UX guard only — every /api/admin route independently requires the ADMIN role.
export default function AdminUsersPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Suspense fallback={<PageLoading />}>
        <UsersView />
      </Suspense>
    </RequireRole>
  );
}
