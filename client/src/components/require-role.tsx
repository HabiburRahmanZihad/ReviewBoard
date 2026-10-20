"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { homePathFor } from "@/lib/roles";
import { Role } from "@/types";
import { PageLoading } from "@/components/spinner";

/**
 * Client-side route guard. Renders children only for signed-in users whose
 * role is in `roles` (any role when omitted); everyone else is redirected to
 * their own home page, or to /login.
 *
 * Use it inside pages, not layouts: a layout that withholds its children stops
 * Next.js from rendering the page segment at all (instant-navigation validation
 * reports it as a "dropped segment"). `roles` is a plain array so server-rendered
 * pages can pass it.
 *
 * This is a UX convenience — the API enforces the same rules on every request,
 * so hiding a page here is never the thing that keeps data safe.
 */
export function RequireRole({
  roles,
  children,
  fallback = <PageLoading />,
}: {
  roles?: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const allowed = !!user && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (!isLoading && !allowed) router.replace(homePathFor(user));
  }, [isLoading, allowed, user, router]);

  if (isLoading || !allowed) return <>{fallback}</>;
  return <>{children}</>;
}
