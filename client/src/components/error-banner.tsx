import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px]"
    >
      <span className="flex items-center gap-2 text-destructive">
        <CircleAlert className="size-4 shrink-0" aria-hidden />
        {message}
      </span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
