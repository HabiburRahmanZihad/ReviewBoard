import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold tracking-wide text-muted-foreground select-none",
        className
      )}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}

/** Avatar + name + secondary line (usually the email). */
export function UserCell({ name, detail, className }: { name: string; detail?: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <UserAvatar name={name} />
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        {detail && <div className="truncate text-xs text-muted-foreground">{detail}</div>}
      </div>
    </div>
  );
}
