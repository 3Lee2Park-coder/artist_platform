import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // SEO: 모든 UA에 메타데이터를 <head>로 블로킹 렌더(구글·크롬 포함). 스트리밍 메타데이터 비활성.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
