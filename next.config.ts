import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "poskart\\.my\\.id" }],
        destination: "https://www.poskart.my.id/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
