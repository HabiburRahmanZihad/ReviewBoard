import { cn } from "@/lib/utils";

/** The mark: a reviewer's tick, stamped in ink. Inverts with the theme. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 shrink-0 text-foreground", className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M7.2 12.4l3.1 3.1 6.5-6.7"
        fill="none"
        stroke="var(--background)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark />
      <span className="font-heading text-[15px] font-semibold tracking-[-0.01em]">ReviewBoard</span>
    </span>
  );
}
