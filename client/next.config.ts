import type { NextConfig } from "next";

// NEXT_PUBLIC_* values are inlined at build time. Without the API URL a deployed
// build would silently call http://localhost:5000 from users' browsers, so fail
// the Vercel build loudly instead.
if (process.env.VERCEL && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. In Vercel → Project → Settings → Environment Variables, " +
      "add NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api and redeploy."
  );
}

const securityHeaders = [
  // Don't let other sites embed the app in a frame (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers guess content types
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin, not full URLs (which can contain filters), to other sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app needs none of these browser features
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
