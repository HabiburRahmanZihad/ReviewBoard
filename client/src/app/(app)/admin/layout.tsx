"use client";

import { RequireRole } from "@/components/require-role";
import { PageLoading } from "@/components/spinner";
import { isAdmin } from "@/lib/roles";

// UX guard only — every /api/admin route independently requires the ADMIN role.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={isAdmin} fallback={<PageLoading />}>
      {children}
    </RequireRole>
  );
}
