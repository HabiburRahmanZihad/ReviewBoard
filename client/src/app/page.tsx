"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { homePathFor } from "@/lib/roles";
import { FullPageSpinner } from "@/components/spinner";

// Entry point: send each user to the right place for their role.
export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) router.replace(homePathFor(user));
  }, [user, isLoading, router]);

  return <FullPageSpinner />;
}
