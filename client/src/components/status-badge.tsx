import { CircleCheck, CircleX, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SubmissionStatus } from "@/types";

const styles: Record<SubmissionStatus, { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: "Pending", className: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: Clock },
  APPROVED: { label: "Approved", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CircleCheck },
  REJECTED: { label: "Rejected", className: "bg-red-500/10 text-red-400 border-red-500/20", Icon: CircleX },
};

export function StatusBadge({ status, className }: { status: SubmissionStatus; className?: string }) {
  const { label, className: tone, Icon } = styles[status];
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      <Icon data-icon="inline-start" />
      {label}
    </Badge>
  );
}
