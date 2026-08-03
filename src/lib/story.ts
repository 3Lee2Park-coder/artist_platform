import { parseJsonStringArray } from "@/lib/json";
import { resolveMediaUrl } from "@/lib/storage-url";

export type StoryTextBlock = {
  id: string;
  type: "text";
  text: string;
};

export type StoryImageBlock = {
  id: string;
  type: "image";
  url: string;
  caption?: string;
};

export type StoryBlock = StoryTextBlock | StoryImageBlock;

function makeId() {
  return `b-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTextBlock(text = ""): StoryTextBlock {
  return { id: makeId(), type: "text", text };
}

export function createImageBlock(url: string, caption = ""): StoryImageBlock {
  return { id: makeId(), type: "image", url, caption };
}

export function parseStoryBlocks(raw: string | null | undefined): StoryBlock[] {
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): StoryBlock | null => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        if (record.type === "text" && typeof record.text === "string") {
          return {
            id: typeof record.id === "string" ? record.id : makeId(),
            type: "text",
            text: record.text
          };
        }
        if (record.type === "image" && typeof record.url === "string" && record.url) {
          const resolved = resolveMediaUrl(record.url) ?? record.url;
          return {
            id: typeof record.id === "string" ? record.id : makeId(),
            type: "image",
            url: resolved,
            caption: typeof record.caption === "string" ? record.caption : undefined
          };
        }
        return null;
      })
      .filter((block): block is StoryBlock => Boolean(block));
  } catch {
    return [];
  }
}

export function serializeStoryBlocks(blocks: StoryBlock[]): string {
  const cleaned = blocks
    .map((block) => {
      if (block.type === "text") {
        return { type: "text" as const, text: block.text.trim() };
      }
      return {
        type: "image" as const,
        url: block.url,
        ...(block.caption?.trim() ? { caption: block.caption.trim() } : {})
      };
    })
    .filter((block) =>
      block.type === "image" ? Boolean(block.url) : block.text.length > 0
    );

  return JSON.stringify(cleaned);
}

export function storyBlocksToPlainText(blocks: StoryBlock[]): string {
  return blocks
    .filter((block): block is StoryTextBlock => block.type === "text")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function storyBlocksToImageUrls(blocks: StoryBlock[]): string[] {
  return blocks
    .filter((block): block is StoryImageBlock => block.type === "image")
    .map((block) => block.url)
    .filter(Boolean);
}

/** storyJson이 비어 있으면 description + imageUrls로 폴백 블록을 만든다 */
export function resolveStoryBlocks(input: {
  storyJson?: string | null;
  description?: string | null;
  imageUrls?: string[] | string | null;
}): StoryBlock[] {
  const fromJson = parseStoryBlocks(input.storyJson);
  if (fromJson.length > 0) return fromJson;

  const blocks: StoryBlock[] = [];
  const description = input.description?.trim();
  if (description) {
    for (const paragraph of description.split(/\n{2,}/)) {
      const text = paragraph.trim();
      if (text) blocks.push(createTextBlock(text));
    }
  }

  const images =
    typeof input.imageUrls === "string"
      ? parseJsonStringArray(input.imageUrls)
      : input.imageUrls ?? [];

  for (const url of images) {
    const resolved = resolveMediaUrl(url) ?? url;
    if (resolved) blocks.push(createImageBlock(resolved));
  }

  return blocks;
}
