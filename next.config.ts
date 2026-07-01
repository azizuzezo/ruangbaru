import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-icons"],
  },
  // Permanent (308) redirects for legacy/English aliases → canonical Indonesian
  // routes. Resolved by the router before any page renders, so search engines
  // consolidate ranking signals onto the canonical URL instead of splitting
  // them across duplicates.
  async redirects() {
    return [
      { source: "/features", destination: "/fitur", permanent: true },
      { source: "/pricing", destination: "/harga", permanent: true },
      { source: "/how-it-works", destination: "/cara-kerja", permanent: true },
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      { source: "/terms", destination: "/terms-of-service", permanent: true },
    ];
  },
};

export default nextConfig;
