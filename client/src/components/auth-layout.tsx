import { Brand } from "@/components/brand";
import { StatusBadge } from "@/components/status-badge";
import { TimelineNode, TimelineKind } from "@/components/timeline-node";

// A sample of what the product does, shown with the product's own components
const SAMPLE: { kind: TimelineKind; actor: string; text: string; when: string; body?: string }[] = [
  { kind: "submitted", actor: "Ayesha Rahman", text: "submitted the project", when: "3 days ago" },
  {
    kind: "comment",
    actor: "Senior Mentor",
    text: "commented",
    when: "2 days ago",
    body: "Search feels instant. Add an empty state for “no recipes found”.",
  },
  { kind: "approved", actor: "Senior Mentor", text: "approved the submission", when: "yesterday" },
];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between border-r bg-card p-10 lg:flex xl:p-14">
        <Brand />

        <div className="max-w-md">
          <h2 className="font-heading text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
            Ship your project. Get it reviewed by a mentor.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Send your GitHub repo and live link. Mentors read it, comment, and approve or reject it — and every step stays on
            the record.
          </p>

          <figure className="mt-10 rounded-xl border bg-background p-5 shadow-sm" aria-label="Example review timeline">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[12.5px]">
                  <span className="text-muted-foreground">ayesha/</span>recipe-finder
                </p>
                <p className="mt-0.5 font-heading text-[15px] font-semibold">Recipe Finder</p>
              </div>
              <StatusBadge status="APPROVED" />
            </div>
            <ol className="mt-5">
              {SAMPLE.map((event, i) => (
                <li key={event.kind} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < SAMPLE.length - 1 && <span className="absolute top-7 bottom-0 left-3.25 w-px bg-border" aria-hidden />}
                  <TimelineNode kind={event.kind} />
                  <div className="min-w-0 pt-0.75 text-[13px] leading-5">
                    <span className="font-medium">{event.actor}</span>{" "}
                    <span className="text-muted-foreground">
                      {event.text} · {event.when}
                    </span>
                    {event.body && (
                      <p className="mt-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-[13px] leading-relaxed">{event.body}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </figure>
        </div>

        <p className="text-xs text-muted-foreground">For students, mentors and course admins.</p>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
