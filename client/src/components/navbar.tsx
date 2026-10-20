"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { confirmAction, showToast } from "@/lib/alerts";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    const confirmed = await confirmAction({
      title: "Sign Out?",
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
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-bold tracking-tight cursor-pointer bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              onClick={() => router.push("/")}
            >
              ReviewBoard
            </h1>
            <Badge variant="outline" className="text-xs font-normal">
              {user.role === "MENTOR" ? "Mentor" : "Student"}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.name} ({user.email})
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
