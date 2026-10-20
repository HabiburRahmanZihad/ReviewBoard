"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { homePathFor } from "@/lib/roles";
import { Role } from "@/types";
import { FullPageSpinner } from "@/components/spinner";

/**
 * Client-side route guard. Renders children only for users whose role passes
 * `allow`; everyone else is redirected to their own home page (or /login).
 *
 * This is a UX convenience — the API enforces the same rules on every request,
 * so hiding a page here is never the thing that keeps data safe.
 */
export function RequireRole({
  allow,
  children,
  fallback = <FullPageSpinner />,
}: {
  allow: (role: Role) => boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const allowed = !!user && allow(user.role);

  useEffect(() => {
    if (!isLoading && !allowed) router.replace(homePathFor(user));
  }, [isLoading, allowed, user, router]);

  if (isLoading || !allowed) return <>{fallback}</>;
  return <>{children}</>;
}
