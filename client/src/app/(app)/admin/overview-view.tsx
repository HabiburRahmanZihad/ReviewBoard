"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, GitCommitHorizontal, MessageSquare, RotateCcw, UserPlus, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { daysSince, formatDateTime, formatRelative } from "@/lib/format";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useQuery } from "@/hooks/use-query";
import { ActivityItem, ReviewerStat, Submission } from "@/types";
import { PageHeader, Section } from "@/components/page-header";
import { PipelineBar } from "@/components/pipeline-bar";
import { DailyChart } from "@/components/daily-chart";
import { StatusDot } from "@/components/status-badge";
import { UserCell } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { SubmissionRef, SubmissionSheet } from "@/components/submission-sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function OverviewView() {
  const router = useRouter();
  const fetchOverview = useCallback(async (signal: AbortSignal) => (await adminApi.overview(signal)).data!, []);
  const overview = useQuery(fetchOverview);
  const o = overview.data;

  const [selected, setSelected] = useState<SubmissionRef | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const open = (ref: SubmissionRef) => {
    setSelected(ref);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Overview"
        description="Submissions, reviewers and people across ReviewBoard."
        actions={
          <Button variant="outline" onClick={overview.refetch} disabled={overview.isLoading}>
            <RotateCcw data-icon="inline-start" className={cn(overview.isLoading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {overview.error && <ErrorBanner message={overview.error} onRetry={overview.refetch} />}

      <PipelineBar
        counts={o && { pending: o.submissions.pending, approved: o.submissions.approved, rejected: o.submissions.rejected }}
        onSelect={(status) => router.push(`/admin/submissions${status ? `?status=${status.toLowerCase()}` : ""}`)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          href="/admin/users"
          label="People"
          value={o?.users.total}
          detail={o ? `${o.users.students} students · ${o.users.mentors} mentors · ${o.users.admins} admins` : undefined}
        />
        <StatTile
          href="/admin/feedback"
          label="Comments"
          value={o?.feedback.total}
          detail="Feedback written by reviewers"
        />
        <StatTile
          href="/admin/submissions?status=pending"
          label={`Waiting over ${o?.submissions.waitingOverDays ?? 3} days`}
          value={o?.submissions.waitingOver}
          attention={(o?.submissions.waitingOver ?? 0) > 0}
          detail={
            o
              ? o.submissions.waitingOver > 0
                ? "Pending reviews worth following up"
                : "No one has waited long"
              : undefined
          }
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <Section title="Submissions in the last 14 days" description="Each day's submissions, by the status they have today">
            <DailyChart data={o?.daily} />
          </Section>
          <Section title="Reviewer activity" description="Decisions and comments by each mentor and admin">
            <ReviewerTable rows={o?.reviewers} />
          </Section>
        </div>

        <div className="min-w-0 space-y-8">
          <Section
            title="Waiting longest"
            action={
              <Link href="/admin/submissions?status=pending" className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                View queue
              </Link>
            }
          >
            <WaitingList items={o?.waiting} onOpen={open} />
          </Section>
          <Section title="Recent activity">
            <ActivityFeed items={o?.activity} onOpen={(id) => open({ id })} />
          </Section>
        </div>
      </div>

      <SubmissionSheet
        submission={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="admin"
        onChanged={overview.refetch}
      />
    </div>
  );
}

function StatTile({
  href,
  label,
  value,
  detail,
  attention,
}: {
  href: string;
  label: string;
  value?: number;
  detail?: string;
  attention?: boolean;
}) {
  return (
    <Link href={href} className="group rounded-xl border bg-card p-5 transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-3xl font-semibold tracking-tight">{value ?? "–"}</span>
        {attention && <StatusDot status="PENDING" className="size-2.5" />}
      </div>
      <p className="mt-1 min-h-5 text-[13px] text-muted-foreground">{detail}</p>
    </Link>
  );
}

function ReviewerTable({ rows }: { rows?: ReviewerStat[] }) {
  if (!rows) return <div className="h-48 animate-pulse rounded-xl border bg-card" />;
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState title="No reviewers yet" description="Add a mentor from the Users page." />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead className="text-right">Rejected</TableHead>
              <TableHead className="text-right">Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tabular-nums">
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-64">
                  <UserCell name={r.name} detail={roleLabel[r.role]} />
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot status="APPROVED" />
                    {r.approved}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot status="REJECTED" />
                    {r.rejected}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{r.comments}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function WaitingList({ items, onOpen }: { items?: Submission[]; onOpen: (s: Submission) => void }) {
  if (!items) return <div className="h-56 animate-pulse rounded-xl border bg-card" />;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState icon={Check} title="Queue is clear" description="Every submission has been reviewed." />
      </div>
    );
  }
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((s) => {
        const days = daysSince(s.updatedAt);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onOpen(s)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.projectName}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.student.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <StatusDot status="PENDING" />
                {days < 1 ? "Today" : `${days}d`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const activityIcon: Record<ActivityItem["kind"], React.ReactNode> = {
  joined: <UserPlus className="size-3.5" aria-hidden />,
  submitted: <GitCommitHorizontal className="size-3.5" aria-hidden />,
  commented: <MessageSquare className="size-3.5" aria-hidden />,
  approved: <Check className="size-3.5" strokeWidth={2.5} aria-hidden />,
  rejected: <X className="size-3.5" strokeWidth={2.5} aria-hidden />,
};

function describe(item: ActivityItem) {
  switch (item.kind) {
    case "joined":
      return <>joined as {item.role ? `a ${roleLabel[item.role].toLowerCase()}` : "a user"}</>;
    case "submitted":
      return <>submitted <span className="font-medium text-foreground">{item.subject}</span></>;
    case "commented":
      return <>commented on <span className="font-medium text-foreground">{item.subject}</span></>;
    case "approved":
      return <>approved <span className="font-medium text-foreground">{item.subject}</span></>;
    case "rejected":
      return <>rejected <span className="font-medium text-foreground">{item.subject}</span></>;
  }
}

function ActivityFeed({ items, onOpen }: { items?: ActivityItem[]; onOpen: (submissionId: string) => void }) {
  if (!items) return <div className="h-80 animate-pulse rounded-xl border bg-card" />;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState title="Nothing has happened yet" />
      </div>
    );
  }
  return (
    <ol className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((item) => {
        const content = (
          <>
            <span
              className={cn(
                "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
                item.kind === "approved" && "border-transparent bg-approved text-white",
                item.kind === "rejected" && "border-transparent bg-rejected text-white",
                item.kind !== "approved" && item.kind !== "rejected" && "bg-card text-muted-foreground"
              )}
            >
              {activityIcon[item.kind]}
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-5">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{item.actor}</span> {describe(item)}
              </span>
              <time dateTime={item.at} title={formatDateTime(item.at)} className="block text-xs text-muted-foreground">
                {formatRelative(item.at)}
              </time>
            </span>
          </>
        );
        return (
          <li key={item.id}>
            {item.submissionId ? (
              <button
                type="button"
                onClick={() => onOpen(item.submissionId!)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
