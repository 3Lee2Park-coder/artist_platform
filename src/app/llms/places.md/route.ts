import { llmIntro, buildPlacesMarkdown } from "@/lib/llm-index";
import { llmTextResponse } from "@/lib/llm-response";

export const revalidate = 3600;

export async function GET() {
  try {
    return llmTextResponse(await buildPlacesMarkdown(), "text/markdown");
  } catch (error) {
    console.error("llms/places.md", error);
    return llmTextResponse(llmIntro(), "text/plain", 300);
  }
}
