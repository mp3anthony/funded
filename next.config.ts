import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Keeps pre-16.4 prefetch behaviour; revisit when moving to the next major.
  partialPrefetching: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NODE_ENV !== "production"
        ),
      },
    ];
  },
};

export default nextConfig;
