import { LayoutGrid, List, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewMode } from "@/hooks/use-view-mode";

const OPTIONS: { value: ViewMode; label: string; icon: LucideIcon }[] = [
  { value: "list", label: "List view", icon: List },
  { value: "cards", label: "Card view", icon: LayoutGrid },
];

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div role="group" aria-label="Layout" className="inline-flex shrink-0 rounded-lg border bg-card p-0.5">
      {OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(option)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
