import { resolveStoryBlocks, type StoryBlock } from "@/lib/story";

type StoryRendererProps = {
  title?: string;
  storyJson?: string | null;
  description?: string | null;
  imageUrls?: string[] | null;
  blocks?: StoryBlock[];
  className?: string;
};

type StorySegment =
  | { type: "text"; block: Extract<StoryBlock, { type: "text" }> }
  | { type: "images"; blocks: Array<Extract<StoryBlock, { type: "image" }>> };

function toSegments(blocks: StoryBlock[]): StorySegment[] {
  const segments: StorySegment[] = [];

  for (const block of blocks) {
    if (block.type === "text") {
      segments.push({ type: "text", block });
      continue;
    }

    const last = segments[segments.length - 1];
    if (last?.type === "images") {
      last.blocks.push(block);
    } else {
      segments.push({ type: "images", blocks: [block] });
    }
  }

  return segments;
}

export function StoryRenderer({
  title = "소개",
  storyJson,
  description,
  imageUrls,
  blocks: blocksProp,
  className = "story-renderer"
}: StoryRendererProps) {
  const blocks =
    blocksProp ??
    resolveStoryBlocks({
      storyJson,
      description,
      imageUrls: imageUrls ?? []
    });

  if (blocks.length === 0) return null;

  const segments = toSegments(blocks);

  return (
    <div className={className}>
      {title ? <h2 className="story-renderer-title">{title}</h2> : null}
      <div className="story-renderer-body">
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            return (
              <p
                key={segment.block.id || `text-${index}`}
                className="story-renderer-text"
              >
                {segment.block.text}
              </p>
            );
          }

          const count = segment.blocks.length;
          const galleryClass =
            count === 1
              ? "story-image-gallery single"
              : count === 2
                ? "story-image-gallery dual"
                : "story-image-gallery multi";

          return (
            <div key={`images-${index}`} className={galleryClass}>
              {segment.blocks.map((block, imageIndex) => (
                <figure
                  key={block.id || `image-${index}-${imageIndex}`}
                  className="story-renderer-figure"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.url}
                    alt={block.caption || `${title} 이미지 ${imageIndex + 1}`}
                    loading="lazy"
                  />
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
