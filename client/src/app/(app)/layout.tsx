"use client";

import { RequireRole } from "@/components/require-role";
import { AppShell } from "@/components/app-shell";

const anySignedInUser = () => true;

// Every page in this group needs a signed-in user and shares the sidebar shell.
// Each page then narrows access to the roles it serves.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow={anySignedInUser}>
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
