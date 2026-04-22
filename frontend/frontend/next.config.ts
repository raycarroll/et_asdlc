import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static optimization for pages that use client-side auth
  output: 'standalone',

  // Redirect root to login page
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
}

export default nextConfig;
