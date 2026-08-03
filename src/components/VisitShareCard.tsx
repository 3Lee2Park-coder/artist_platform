"use client";

import type { VisitArchiveEntry } from "@/lib/visit-archive";
import { useEffect, useRef, useState } from "react";

type VisitShareCardProps = {
  entry: VisitArchiveEntry;
  userName: string;
  onClose: () => void;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1620;

// heroTone(css linear-gradient 문자열)에서 색상만 추출해 캔버스 그라데이션으로 재현
function extractToneColors(tone: string): string[] {
  const matches = tone.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g);
  return matches && matches.length > 0 ? matches : ["#2b241d", "#c9a988"];
}

function formatVisitedDate(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    // 단어 자체가 길면 글자 단위로 자른다 (한국어 제목 대응)
    if (ctx.measureText(word).width > maxWidth) {
      let chunk = "";
      for (const char of word) {
        if (ctx.measureText(chunk + char).width > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.length > 0) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(`${last}…`).width > maxWidth) {
      lines[maxLines - 1] = `${last.slice(0, -1)}…`;
    }
  }
  return lines.slice(0, maxLines);
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function drawTicket(
  canvas: HTMLCanvasElement,
  entry: VisitArchiveEntry,
  userName: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  // 배경
  ctx.fillStyle = "#f5f1ea";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // 상단 비주얼 영역 (이미지 또는 톤 그라데이션)
  const visualHeight = 880;
  const heroImage = entry.heroImageUrl
    ? await loadImage(entry.heroImageUrl)
    : null;

  if (heroImage) {
    const scale = Math.max(
      CARD_WIDTH / heroImage.width,
      visualHeight / heroImage.height
    );
    const drawWidth = heroImage.width * scale;
    const drawHeight = heroImage.height * scale;
    ctx.drawImage(
      heroImage,
      (CARD_WIDTH - drawWidth) / 2,
      (visualHeight - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    const overlay = ctx.createLinearGradient(0, 0, 0, visualHeight);
    overlay.addColorStop(0, "rgba(15,12,9,0)");
    overlay.addColorStop(1, "rgba(15,12,9,0.35)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, CARD_WIDTH, visualHeight);
  } else {
    const colors = extractToneColors(entry.heroTone);
    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, visualHeight);
    colors.forEach((color, index) => {
      gradient.addColorStop(index / Math.max(1, colors.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, visualHeight);

    // 그라데이션 위 워터마크 이니셜
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "700 420px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entry.title.slice(0, 1), CARD_WIDTH / 2, visualHeight / 2 + 20);
  }

  // 방문 종류 배지
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const badgeText = entry.kindLabel;
  ctx.font = "600 40px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const badgeWidth = ctx.measureText(badgeText).width + 72;
  const badgeX = 64;
  const badgeY = 64;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, 88, 44);
  ctx.fill();
  ctx.fillStyle = "#2b241d";
  ctx.fillText(badgeText, badgeX + 36, badgeY + 46);

  // 티켓 절취선
  const ticketTop = visualHeight;
  ctx.strokeStyle = "#c9bfae";
  ctx.setLineDash([18, 16]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(48, ticketTop);
  ctx.lineTo(CARD_WIDTH - 48, ticketTop);
  ctx.stroke();
  ctx.setLineDash([]);

  // 절취선 양끝 펀치홀
  ctx.fillStyle = "#e7e0d3";
  for (const x of [0, CARD_WIDTH]) {
    ctx.beginPath();
    ctx.arc(x, ticketTop, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  // 본문
  const contentX = 72;
  let cursorY = ticketTop + 110;

  ctx.fillStyle = "#8a7a63";
  ctx.font = "600 38px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText("VISIT RECORD", contentX, cursorY);
  cursorY += 84;

  ctx.fillStyle = "#221c15";
  ctx.font = "700 76px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
  const titleLines = wrapText(ctx, entry.title, CARD_WIDTH - contentX * 2, 2);
  for (const line of titleLines) {
    ctx.fillText(line, contentX, cursorY);
    cursorY += 96;
  }
  cursorY += 8;

  if (entry.subtitle) {
    ctx.fillStyle = "#5c5344";
    ctx.font = "400 44px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
    const subtitleLines = wrapText(ctx, entry.subtitle, CARD_WIDTH - contentX * 2, 1);
    for (const line of subtitleLines) {
      ctx.fillText(line, contentX, cursorY);
      cursorY += 64;
    }
  }

  // 정보 행
  cursorY = ticketTop + 470;
  const infoPairs: Array<[string, string]> = [
    ["방문일", formatVisitedDate(entry.visitedAt)],
    ["장소", entry.district ?? "서울"],
    ["방문자", userName]
  ];
  const columnWidth = (CARD_WIDTH - contentX * 2) / 3;
  infoPairs.forEach(([label, value], index) => {
    const x = contentX + columnWidth * index;
    ctx.fillStyle = "#8a7a63";
    ctx.font = "600 34px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
    ctx.fillText(label, x, cursorY);
    ctx.fillStyle = "#221c15";
    ctx.font = "600 46px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
    ctx.fillText(value, x, cursorY + 62);
  });

  // 하단 브랜드
  ctx.strokeStyle = "#d8cfbe";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, CARD_HEIGHT - 130);
  ctx.lineTo(CARD_WIDTH - contentX, CARD_HEIGHT - 130);
  ctx.stroke();

  ctx.fillStyle = "#221c15";
  ctx.font = "700 44px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
  ctx.fillText("Exhibit", contentX, CARD_HEIGHT - 66);
  ctx.fillStyle = "#8a7a63";
  ctx.font = "400 34px 'Pretendard', 'Apple SD Gothic Neo', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("작가의 공간을 만나는 기록", CARD_WIDTH - contentX, CARD_HEIGHT - 66);
  ctx.textAlign = "left";
}

export function VisitShareCard({ entry, userName, onClose }: VisitShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!canvasRef.current) return;
      await drawTicket(canvasRef.current, entry, userName);
      if (!cancelled) setReady(true);
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [entry, userName]);

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function handleDownload() {
    const blob = await toBlob();
    if (!blob) {
      setStatus("이미지 생성에 실패했습니다.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `exhibit-visit-${entry.id}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("이미지를 저장했습니다. 인스타그램에 공유해보세요!");
  }

  async function handleShare() {
    const blob = await toBlob();
    if (blob && navigator.canShare) {
      const file = new File([blob], `exhibit-visit-${entry.id}.png`, {
        type: "image/png"
      });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: entry.title,
            text: `${entry.title} 방문 기록 — Exhibit`
          });
          return;
        } catch {
          return;
        }
      }
    }
    await handleDownload();
  }

  return (
    <div
      className="share-card-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="방문 기록 공유 카드"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="share-card-modal">
        <div className="share-card-preview">
          <canvas
            ref={canvasRef}
            className="share-card-canvas"
            aria-label={`${entry.title} 방문 티켓`}
          />
          {!ready ? <p className="share-card-loading">카드를 만드는 중…</p> : null}
        </div>

        <div className="share-card-actions">
          <button type="button" className="primary-button" onClick={handleShare}>
            공유하기
          </button>
          <button type="button" className="secondary-button" onClick={handleDownload}>
            이미지 저장
          </button>
          <button type="button" className="share-card-close" onClick={onClose}>
            닫기
          </button>
        </div>
        {status ? <p className="share-card-status">{status}</p> : null}
      </div>
    </div>
  );
}
