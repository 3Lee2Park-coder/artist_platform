"use client";

import {
  createImageBlock,
  createTextBlock,
  type StoryBlock
} from "@/lib/story";
import { useState } from "react";

type RichIntroEditorProps = {
  label?: string;
  hint?: string;
  blocks: StoryBlock[];
  onChange: (blocks: StoryBlock[]) => void;
  uploadFolder: string;
  onError?: (message: string) => void;
};

async function uploadFile(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "이미지 업로드에 실패했습니다.");
  return data.url as string;
}

export function RichIntroEditor({
  label = "소개 본문",
  hint = "텍스트와 이미지를 원하는 순서로 배치해 자유롭게 소개를 작성하세요.",
  blocks,
  onChange,
  uploadFolder,
  onError
}: RichIntroEditorProps) {
  const [uploading, setUploading] = useState(false);

  function updateBlock(id: string, patch: Partial<StoryBlock>) {
    onChange(
      blocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as StoryBlock) : block
      )
    );
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((block) => block.id !== id));
  }

  function moveBlock(id: string, direction: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === id);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange(copy);
  }

  async function handleAddImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...blocks];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, uploadFolder);
        next.push(createImageBlock(url));
      }
      onChange(next);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rich-intro-editor">
      <div className="rich-intro-editor-head">
        <div>
          <p className="field-label">{label}</p>
          <p className="field-hint">{hint}</p>
        </div>
        <div className="rich-intro-toolbar">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onChange([...blocks, createTextBlock()])}
          >
            텍스트 추가
          </button>
          <label className="secondary-button rich-intro-upload">
            {uploading ? "업로드 중..." : "이미지 추가"}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={uploading}
              onChange={(event) => {
                void handleAddImages(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="rich-intro-empty">
          <p>아직 본문이 없습니다. 텍스트나 이미지를 추가해 소개를 시작해 보세요.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => onChange([createTextBlock()])}
          >
            첫 문단 작성
          </button>
        </div>
      ) : (
        <div className="rich-intro-blocks">
          {blocks.map((block, index) => (
            <article key={block.id} className={`rich-intro-block type-${block.type}`}>
              <div className="rich-intro-block-bar">
                <span>{block.type === "text" ? "텍스트" : "이미지"}</span>
                <div className="rich-intro-block-actions">
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, -1)}
                    disabled={index === 0}
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 1)}
                    disabled={index === blocks.length - 1}
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => removeBlock(block.id)}>
                    삭제
                  </button>
                </div>
              </div>

              {block.type === "text" ? (
                <textarea
                  value={block.text}
                  rows={5}
                  placeholder="공간·프로그램·코스를 자유롭게 소개해 주세요."
                  onChange={(event) =>
                    updateBlock(block.id, { text: event.target.value })
                  }
                />
              ) : (
                <div className="rich-intro-image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={block.url} alt={block.caption || "소개 이미지"} />
                  <input
                    value={block.caption ?? ""}
                    placeholder="이미지 캡션 (선택)"
                    onChange={(event) =>
                      updateBlock(block.id, { caption: event.target.value })
                    }
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
