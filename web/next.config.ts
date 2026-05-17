import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },

  // Same-origin Convex proxy: browser requests to /convex/* are forwarded to
  // the local Convex backend. Avoids Safari blocking cross-origin credentialed
  // fetches on localhost HTTP, and lines up with how @convex-dev/auth sets its
  // session cookie. NEXT_PUBLIC_CONVEX_URL is set to http://localhost:10814/convex.
  async rewrites() {
    if (!isDev) return [];
    const backendUrl =
      process.env.CONVEX_BACKEND_INTERNAL_URL ?? "http://localhost:10810";
    return [
      {
        source: "/convex/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
