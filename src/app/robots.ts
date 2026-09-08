import { getSiteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

const PRIVATE_PATHS = [
  "/admin",
  "/admin/",
  "/my",
  "/my/",
  "/api/",
  "/auth/",
  "/register",
  "/register/",
  "/onboarding",
  "/share/"
];

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "Google-CloudVertexBot",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "Applebot-Extended",
  "Bytespider",
  "CCBot"
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt", "/llms/"],
        disallow: PRIVATE_PATHS
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: ["/", "/llms.txt", "/llms/"],
        disallow: PRIVATE_PATHS
      }))
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
