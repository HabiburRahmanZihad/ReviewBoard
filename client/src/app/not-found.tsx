import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Brand />
      <p className="eyebrow mt-12">Error 404</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.02em]">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">The link may be broken, or the page may have moved.</p>
      <Link href="/" className={buttonVariants({ className: "mt-8 h-9 px-4" })}>
        Go to ReviewBoard
      </Link>
    </div>
  );
}
