import { llmIntro, buildExhibitionsMarkdown } from "@/lib/llm-index";
import { llmTextResponse } from "@/lib/llm-response";

export const revalidate = 3600;

export async function GET() {
  try {
    return llmTextResponse(await buildExhibitionsMarkdown(), "text/markdown");
  } catch (error) {
    console.error("llms/exhibitions.md", error);
    return llmTextResponse(llmIntro(), "text/plain", 300);
  }
}
