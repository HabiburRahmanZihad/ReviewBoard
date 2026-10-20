import { cn } from "@/lib/utils";

export interface FilterOption<T extends string> {
  value: T | undefined;
  label: string;
  count?: number;
}

/** Segmented control for a single server-side filter, with optional counts. */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-lg border bg-card p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value ?? "ALL"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] whitespace-nowrap transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
