"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SubmissionStatus } from "@/types";
import { statusDot, StatusDot, statusLabel } from "@/components/status-badge";

export interface StatusCounts {
  pending: number;
  approved: number;
  rejected: number;
}

const ORDER: { status: SubmissionStatus; key: keyof StatusCounts }[] = [
  { status: "PENDING", key: "pending" },
  { status: "APPROVED", key: "approved" },
  { status: "REJECTED", key: "rejected" },
];

/**
 * How submissions are distributed across the review pipeline: one
 * proportional bar plus a labelled legend that doubles as the status filter.
 * Every value is printed in the legend, so color never carries meaning alone.
 */
export function PipelineBar({
  title = "Review pipeline",
  counts,
  active,
  onSelect,
  error,
}: {
  title?: string;
  counts?: StatusCounts;
  active?: SubmissionStatus;
  onSelect?: (status?: SubmissionStatus) => void;
  error?: string;
}) {
  const [hovered, setHovered] = useState<SubmissionStatus | null>(null);
  const total = counts ? counts.pending + counts.approved + counts.rejected : 0;
  const pct = (value: number) => (total ? Math.round((value / total) * 100) : 0);

  // Horizontal centre (%) of a segment, for positioning the hover tooltip
  const centreOf = (index: number) => {
    const start = ORDER.slice(0, index).reduce((sum, o) => sum + (counts?.[o.key] ?? 0), 0);
    const value = counts?.[ORDER[index].key] ?? 0;
    return total ? ((start + value / 2) / total) * 100 : 0;
  };

  const hoveredIndex = hovered && counts ? ORDER.findIndex((o) => o.status === hovered) : -1;
  const hoveredEntry = hoveredIndex >= 0 ? ORDER[hoveredIndex] : undefined;

  return (
    <section className="rounded-xl border bg-card p-5" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow">{title}</h2>
        <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
          {onSelect && active && (
            <button
              type="button"
              onClick={() => onSelect(undefined)}
              className="rounded-sm underline-offset-4 hover:text-foreground hover:underline"
            >
              Show all
            </button>
          )}
          <span>
            <span className="font-semibold text-foreground">{counts ? total : "–"}</span> total
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <div
          role="img"
          aria-label={
            counts
              ? ORDER.map(({ status, key }) => `${counts[key]} ${statusLabel[status].toLowerCase()}`).join(", ")
              : "Loading"
          }
          className={cn(
            "flex h-2.5 gap-0.5 overflow-hidden rounded-full",
            (!counts || total === 0) && "bg-muted",
            !counts && !error && "animate-pulse"
          )}
        >
          {counts &&
            total > 0 &&
            ORDER.map(({ status, key }) =>
              counts[key] > 0 ? (
                <div
                  key={status}
                  className={cn(
                    "h-full min-w-1 transition-[flex-grow,opacity] duration-500",
                    statusDot[status],
                    active && active !== status && "opacity-30"
                  )}
                  style={{ flexGrow: counts[key] }}
                  onMouseEnter={() => setHovered(status)}
                  onMouseLeave={() => setHovered(null)}
                />
              ) : null
            )}
        </div>

        {hoveredEntry && counts && (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
            style={{ left: `${Math.min(92, Math.max(8, centreOf(hoveredIndex)))}%` }}
          >
            <span className="font-medium">{statusLabel[hoveredEntry.status]}</span>
            <span className="text-muted-foreground">
              {" "}
              · {counts[hoveredEntry.key]} of {total} ({pct(counts[hoveredEntry.key])}%)
            </span>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}

      <div className="mt-3 grid grid-cols-3 gap-1 sm:gap-2">
        {ORDER.map(({ status, key }) => {
          const value = counts?.[key] ?? 0;
          const isActive = active === status;
          const body = (
            <>
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <StatusDot status={status} />
                {statusLabel[status]}
              </span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{counts ? value : "–"}</span>
                {counts && <span className="text-xs text-muted-foreground tabular-nums">{pct(value)}%</span>}
              </span>
            </>
          );
          return onSelect ? (
            <button
              key={status}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(isActive ? undefined : status)}
              className={cn(
                "flex flex-col items-start rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/70 sm:px-3",
                isActive && "bg-muted"
              )}
            >
              {body}
            </button>
          ) : (
            <div key={status} className="flex flex-col items-start px-2.5 py-2 sm:px-3">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
