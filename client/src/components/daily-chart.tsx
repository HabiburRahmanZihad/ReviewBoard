"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/format";
import { DailyCount, SubmissionStatus } from "@/types";
import { statusDot, StatusDot, statusLabel } from "@/components/status-badge";

// Stack order (baseline up) matches the pipeline bar's left-to-right order
const SERIES: { key: "pending" | "approved" | "rejected"; status: SubmissionStatus }[] = [
  { key: "pending", status: "PENDING" },
  { key: "approved", status: "APPROVED" },
  { key: "rejected", status: "REJECTED" },
];

/** Smallest clean scale whose midpoint tick covers the peak: 0 / s / 2s with s in 1, 2, 5, 10, 20, 25, 50… */
function scaleMax(peak: number): number {
  const steps = [1, 2, 5, 10, 20, 25, 50];
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const step of steps) {
      if (step * magnitude * 2 >= peak) return Math.max(2, step * magnitude * 2);
    }
  }
}

/**
 * Submissions created per day, stacked by the status each one has today.
 * Hover a day for exact counts; "Show as table" gives the same numbers as text.
 */
export function DailyChart({ data }: { data?: DailyCount[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  if (!data) return <div className="h-72 animate-pulse rounded-xl border bg-card" />;

  const totals = data.map((d) => d.pending + d.approved + d.rejected);
  const sum = totals.reduce((a, b) => a + b, 0);
  const max = scaleMax(Math.max(...totals));
  const ticks = [max, max / 2, 0];

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
          {SERIES.map(({ status }) => (
            <li key={status} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <StatusDot status={status} />
              {statusLabel[status]}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setAsTable((value) => !value)}
          className="rounded-sm text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <div className="mt-4 max-h-64 overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b">
                <th className="eyebrow py-2 text-left">Day</th>
                {SERIES.map(({ status }) => (
                  <th key={status} className="eyebrow py-2 text-right">
                    {statusLabel[status]}
                  </th>
                ))}
                <th className="eyebrow py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d, i) => (
                <tr key={d.date} className="border-b last:border-0">
                  <td className="py-1.5">{formatDay(d.date)}</td>
                  {SERIES.map(({ key }) => (
                    <td key={key} className="py-1.5 text-right text-muted-foreground">
                      {d[key]}
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-medium">{totals[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5" role="img" aria-label={`Submissions per day over the last ${data.length} days: ${sum} in total.`}>
          <div className="flex gap-3">
            {/* Y axis */}
            <div className="relative h-48 w-6 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums" aria-hidden>
              {ticks.map((tick) => (
                <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - tick / max) * 100}%` }}>
                  {tick}
                </span>
              ))}
            </div>

            <div className="relative h-48 flex-1">
              {ticks.map((tick) => (
                <div key={tick} className="absolute inset-x-0 h-px bg-border" style={{ top: `${(1 - tick / max) * 100}%` }} aria-hidden />
              ))}

              <div className="absolute inset-0 flex items-end">
                {data.map((day, i) => {
                  const total = totals[i];
                  const stack = SERIES.filter(({ key }) => day[key] > 0);
                  const align = i < 3 ? "left-0" : i > data.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <div
                      key={day.date}
                      className="relative flex h-full flex-1 items-end justify-center px-0.5"
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {hovered === i && <div className="absolute inset-0 rounded-md bg-muted/60" aria-hidden />}
                      {total > 0 && (
                        <div
                          className="relative flex w-full max-w-6 flex-col-reverse gap-0.5"
                          style={{ height: `${(total / max) * 100}%`, minHeight: 4 }}
                        >
                          {stack.map(({ key, status }, j) => (
                            <div
                              key={key}
                              className={cn(statusDot[status], "min-h-0.5", j === stack.length - 1 && "rounded-t-sm")}
                              style={{ flexGrow: day[key] }}
                            />
                          ))}
                        </div>
                      )}
                      {hovered === i && (
                        <div
                          className={cn(
                            "pointer-events-none absolute z-10 w-40 rounded-md border bg-popover p-2.5 text-xs shadow-md",
                            align
                          )}
                          style={{ bottom: `calc(${(total / max) * 100}% + 10px)` }}
                        >
                          <p className="mb-1.5 font-medium">{formatDay(day.date)}</p>
                          {SERIES.map(({ key, status }) => (
                            <p key={key} className="flex items-center justify-between gap-3 text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <StatusDot status={status} />
                                {statusLabel[status]}
                              </span>
                              <span className="text-foreground tabular-nums">{day[key]}</span>
                            </p>
                          ))}
                          <p className="mt-1.5 flex justify-between border-t pt-1.5">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-medium tabular-nums">{total}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X axis: every day on wide screens, every other day on phones */}
          <div className="mt-2 flex gap-3" aria-hidden>
            <div className="w-6 shrink-0" />
            <div className="flex flex-1">
              {data.map((day, i) => (
                <span
                  key={day.date}
                  className={cn(
                    "flex-1 text-center text-[11px] text-muted-foreground tabular-nums",
                    i % 2 === 1 && i !== data.length - 1 && "invisible sm:visible"
                  )}
                >
                  {i === 0 || day.date.endsWith("-01") ? formatDay(day.date) : Number(day.date.slice(8))}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
