import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Schibsted_Grotesk } from "next/font/google";
import { AuthProvider } from "@/hooks/use-auth";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Toaster } from "@/components/toaster";
import { ConfirmHost } from "@/components/confirm-dialog";
import "./globals.css";

// Headings: a sturdy grotesque with character, used sparingly
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

// UI text: engineered, legible in dense tables; width axis powers condensed labels
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Code artifacts: repo slugs and URLs
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "ReviewBoard",
    template: "%s · ReviewBoard",
  },
  description: "Submit course projects, get them reviewed by mentors, and track every decision.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets `class="dark"` before hydration, so React must not complain about it
    <html
      lang="en"
      className={`${schibsted.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        <ConfirmHost />
      </body>
    </html>
  );
}
