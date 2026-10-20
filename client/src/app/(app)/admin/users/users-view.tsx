"use client";

import { useCallback, useEffect, useState } from "react";
import { Ellipsis, Pencil, Trash, UserPlus, Users } from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
import { confirmAction, showToast } from "@/lib/alerts";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@/hooks/use-query";
import { useUrlParams } from "@/hooks/use-url-params";
import { AdminUser, Role } from "@/types";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { FilterTabs } from "@/components/filter-tabs";
import { RoleBadge } from "@/components/role-badge";
import { UserCell } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserDialog } from "./user-dialog";

const PAGE_SIZE = 10;
const ROLES: Role[] = ["STUDENT", "MENTOR", "ADMIN"];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function activitySummary(user: AdminUser) {
  if (user.role === "STUDENT") return plural(user._count.submissions, "submission");
  return `${plural(user._count.reviewedSubmissions, "review")} · ${plural(user._count.feedbacks, "comment")}`;
}

export function UsersView() {
  const { user: me } = useAuth();
  const { searchParams, page, query, update } = useUrlParams();
  const role = ROLES.find((r) => r === searchParams.get("role")?.toUpperCase());

  const fetchUsers = useCallback(
    async (signal: AbortSignal) =>
      (await adminApi.listUsers({ page, limit: PAGE_SIZE, role, search: query || undefined }, signal)).data!,
    [page, role, query]
  );
  const users = useQuery(fetchUsers);

  const totalPages = users.data?.pagination.totalPages;
  useEffect(() => {
    if (!users.isLoading && totalPages && page > totalPages) update({ page: totalPages > 1 ? String(totalPages) : undefined });
  }, [users.isLoading, totalPages, page, update]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setDialogOpen(true);
  };

  const remove = async (user: AdminUser) => {
    const consequence =
      user.role === "STUDENT"
        ? user._count.submissions > 0
          ? `This also deletes their ${plural(user._count.submissions, "submission")} and all feedback on them.`
          : "They have no submissions."
        : "Reviews and comments they wrote are kept, without their name.";
    const confirmed = await confirmAction({
      title: `Delete ${user.name}?`,
      description: `${consequence} This can't be undone.`,
      confirmLabel: "Delete user",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await adminApi.deleteUser(user.id);
      showToast(`${user.name} deleted`);
      users.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const commitSearch = useCallback((q: string) => update({ q: q || undefined, page: undefined }), [update]);
  const counts = users.data?.roleCounts;
  const rows = users.data?.users ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Everyone with an account. Add mentors, change roles and reset passwords."
        actions={
          <Button size="lg" onClick={openCreate}>
            <UserPlus data-icon="inline-start" />
            Add user
          </Button>
        }
      />

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={query} onCommit={commitSearch} placeholder="Search name or email" />
          <FilterTabs
            label="Filter by role"
            value={role}
            onChange={(next) => update({ role: next?.toLowerCase(), page: undefined })}
            options={[
              { value: undefined, label: "All", count: counts?.ALL },
              { value: "STUDENT", label: "Students", count: counts?.STUDENT },
              { value: "MENTOR", label: "Mentors", count: counts?.MENTOR },
              { value: "ADMIN", label: "Admins", count: counts?.ADMIN },
            ]}
          />
        </div>

        {users.error && <ErrorBanner message={users.error} onRetry={users.refetch} />}

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className={cn("overflow-x-auto transition-opacity", users.isLoading && users.data && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Activity</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!users.data && users.isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell colSpan={5}>
                        <div className="h-9 animate-pulse rounded-md bg-muted/60" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="whitespace-normal">
                      <EmptyState
                        icon={Users}
                        title="No users match"
                        description="Try a different name, email or role."
                        action={
                          <Button variant="outline" size="sm" onClick={() => update({ role: undefined, q: undefined, page: undefined })}>
                            Clear filters
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((user) => {
                    const isSelf = user.id === me?.id;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="max-w-72">
                          <div className="flex items-center gap-2">
                            <UserCell name={user.name} detail={user.email} />
                            {isSelf && (
                              <span className="shrink-0 rounded border px-1.5 text-[11px] text-muted-foreground">You</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{activitySummary(user)}</TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          <time dateTime={user.createdAt} title={formatDateTime(user.createdAt)}>
                            {formatRelative(user.createdAt)}
                          </time>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`} />}
                            >
                              <Ellipsis />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Pencil aria-hidden />
                                Edit user
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" disabled={isSelf} onClick={() => remove(user)}>
                                <Trash aria-hidden />
                                {isSelf ? "Can't delete yourself" : "Delete user"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {users.data && users.data.pagination.totalCount > 0 && (
            <div className="border-t px-5 py-3">
              <Pagination
                pagination={users.data.pagination}
                onPageChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
                disabled={users.isLoading}
              />
            </div>
          )}
        </div>
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        isSelf={editing?.id === me?.id}
        onSaved={users.refetch}
      />
    </div>
  );
}
