import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Next 16.2.9 기본값 복사, 업그레이드 시 재확인
  // node_modules/next/dist/shared/lib/router/utils/html-bots.js
  // 설정 시 기본 목록을 대체하므로 기본 정규식에 Googlebot만 붙인다.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|Googlebot/i,
};

export default nextConfig;
