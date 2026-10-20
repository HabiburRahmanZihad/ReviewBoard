import { FolderGit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { repoSlug } from "@/lib/format";

/**
 * A repository shown the way developers recognise it: `owner/repo` in mono,
 * with the repo name emphasised. Links out unless `asLink` is false.
 */
export function RepoSlug({
  repoUrl,
  asLink = true,
  icon = false,
  className,
}: {
  repoUrl: string;
  asLink?: boolean;
  icon?: boolean;
  className?: string;
}) {
  const slug = repoSlug(repoUrl);
  const [owner, ...rest] = slug.split("/");
  const content = (
    <>
      {icon && <FolderGit2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="truncate">
        <span className="text-muted-foreground">{owner}/</span>
        <span className="text-foreground">{rest.join("/")}</span>
      </span>
    </>
  );
  const classes = cn("inline-flex min-w-0 items-center gap-1.5 font-mono text-[12.5px] leading-5", className);

  if (!asLink) return <span className={classes}>{content}</span>;
  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(classes, "rounded-sm underline-offset-4 hover:underline")}
    >
      {content}
    </a>
  );
}
