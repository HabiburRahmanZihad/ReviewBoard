import { AppShell } from "@/components/app-shell";

// The signed-in area's shared sidebar shell. It always renders its children:
// each page guards its own content with <RequireRole>, so Next.js can render
// every page segment (a layout that withheld children until the session check
// finished would be reported as a "dropped segment" by instant-navigation validation).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
