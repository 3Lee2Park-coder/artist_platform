import { llmIntro, buildDecksMarkdown } from "@/lib/llm-index";
import { llmTextResponse } from "@/lib/llm-response";

export const revalidate = 3600;

export async function GET() {
  try {
    return llmTextResponse(await buildDecksMarkdown(), "text/markdown");
  } catch (error) {
    console.error("llms/decks.md", error);
    return llmTextResponse(llmIntro(), "text/plain", 300);
  }
}
