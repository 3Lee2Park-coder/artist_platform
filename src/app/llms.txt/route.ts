import { llmIntro, buildLlmsTxt } from "@/lib/llm-index";
import { llmTextResponse } from "@/lib/llm-response";

export const revalidate = 3600;

export async function GET() {
  try {
    return llmTextResponse(await buildLlmsTxt(), "text/plain");
  } catch (error) {
    console.error("llms.txt", error);
    return llmTextResponse(llmIntro(), "text/plain", 300);
  }
}
