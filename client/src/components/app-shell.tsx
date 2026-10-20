"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  FolderGit2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  LucideIcon,
  Menu,
  MessageSquareText,
  Monitor,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { homePathFor, roleLabel } from "@/lib/roles";
import { confirmAction, showToast } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { Role, User } from "@/types";
import { ThemePreference } from "@/lib/theme";
import { Brand } from "@/components/brand";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { href: string; label: string; icon: LucideIcon };

// Each role sees only the places it can act in
const NAV: Record<Role, { area: string; items: NavItem[] }> = {
  STUDENT: { area: "Student", items: [{ href: "/submissions", label: "My submissions", icon: FolderGit2 }] },
  MENTOR: { area: "Mentor", items: [{ href: "/dashboard", label: "Review queue", icon: ListChecks }] },
  ADMIN: {
    area: "Administration",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/submissions", label: "Submissions", icon: FolderGit2 },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquareText },
    ],
  },
};

const THEMES: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Sidebar + content frame for the signed-in area. It always renders `children`
 * — pages guard themselves — and shows a skeleton sidebar until the session is
 * known, so the frame never jumps when navigation fills in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh border-r bg-sidebar lg:block">
        {user ? <SidebarContent user={user} /> : <SidebarSkeleton />}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Link href={user ? homePathFor(user) : "/"} aria-label="ReviewBoard home">
            <Brand />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            disabled={!user}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        </header>

        <main id="main" className="mx-auto w-full max-w-304 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>

      {user && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="bg-sidebar">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/** Placeholder while the session is being checked: same geometry as the real sidebar. */
function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      <div className="flex h-16 items-center px-5">
        <Brand />
      </div>
      <div className="flex-1 space-y-2 px-5 py-4">
        <div className="mb-4 h-3 w-24 animate-pulse rounded bg-muted" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 animate-pulse rounded-md bg-muted/70" />
        ))}
      </div>
      <div className="flex items-center gap-2.5 border-t p-4">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function SidebarContent({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { area, items } = NAV[user.role];

  // "/admin" only matches exactly; deeper items match their sub-routes
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href={homePathFor(user)} onClick={onNavigate} className="rounded-md" aria-label="ReviewBoard home">
          <Brand />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main">
        <p className="eyebrow px-2.5 pb-2">{area}</p>
        <ul className="space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  {active && <span className="absolute top-2 bottom-2 -left-3 w-0.75 rounded-r bg-foreground" aria-hidden />}
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-3">
        <UserMenu user={user} />
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useTheme();

  const signOut = async () => {
    const confirmed = await confirmAction({
      title: "Sign out of ReviewBoard?",
      description: "You'll need your email and password to sign back in.",
      confirmLabel: "Sign out",
    });
    if (!confirmed) return;
    logout();
    showToast("Signed out", "info");
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent"
        aria-label="Account menu"
      >
        <UserAvatar name={user.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{roleLabel[user.role]}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--anchor-width) min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-[13px] font-medium text-foreground">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon aria-hidden />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
