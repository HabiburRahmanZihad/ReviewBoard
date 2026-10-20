import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/spinner";
import { UsersView } from "./users-view";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <UsersView />
    </Suspense>
  );
}
