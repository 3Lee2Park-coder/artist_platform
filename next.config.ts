import type { NextConfig } from "next";
import { EXHIBITION_REDIRECTS } from "./src/lib/exhibition-redirects";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return Object.entries(EXHIBITION_REDIRECTS).map(([source, destination]) => ({
      source: `/exhibitions/${source}`,
      destination: `/exhibitions/${destination}`,
      permanent: true
    }));
  }
};

export default nextConfig;