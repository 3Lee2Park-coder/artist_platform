export type ShareDeckResult = "shared" | "copied" | "cancelled" | "manual";

function shareText(input: { title: string; url: string; text?: string }) {
  return `${input.text ?? input.title}\n${input.url}`;
}

async function copyLink(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    if (!document.hasFocus()) {
      window.focus();
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    if (!document.hasFocus()) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareDeckLink(input: {
  title: string;
  url: string;
  text?: string;
}): Promise<ShareDeckResult> {
  const payload = shareText(input);

  // 이미지는 Web Share files / ClipboardItem에 넣지 않는다.
  // iOS·카카오는 파일이 있으면 URL을 버리고 이미지만 보낸다. 미리보기는 OG가 맡는다.
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: input.title,
        text: payload,
        url: input.url
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const copied = await copyLink(payload);
  return copied ? "copied" : "manual";
}
