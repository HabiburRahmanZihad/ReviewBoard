"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { homePathFor, roleLabel } from "@/lib/roles";
import { confirmAction, showToast } from "@/lib/alerts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    const confirmed = await confirmAction({
      title: "Sign out?",
      text: "You will need to enter your credentials to log back in.",
      icon: "question",
      confirmButtonText: "Yes, sign out",
      confirmButtonColor: "#ef4444",
    });

    if (confirmed) {
      logout();
      showToast("Signed out successfully", "info");
      router.push("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={homePathFor(user)}
              className="text-xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent"
            >
              ReviewBoard
            </Link>
            <Badge variant="outline" className="text-xs font-normal">
              {roleLabel[user.role]}
            </Badge>
          </div>

          <div className="flex items-center gap-4 min-w-0">
            <span className="text-sm text-muted-foreground hidden sm:inline truncate">
              {user.name} ({user.email})
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
