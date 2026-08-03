import { STORAGE_BUCKET } from "@/lib/supabase";

export function getStoragePublicUrl(storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    return storagePath;
  }

  const normalizedPath = storagePath.replace(/^\/+/, "");
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${normalizedPath}`;
}

/** DB에 저장된 URL 또는 path를 브라우저에서 열 수 있는 public URL로 변환 */
export function resolveMediaUrl(stored: string | null | undefined): string | undefined {
  if (!stored?.trim()) {
    return undefined;
  }

  const value = stored.trim();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

  if (value.includes("/storage/v1/object/public/") && baseUrl) {
    const publicSegment = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const index = value.indexOf(publicSegment);

    if (index >= 0) {
      const path = value.slice(index + publicSegment.length);
      return getStoragePublicUrl(decodeURIComponent(path));
    }

    return value;
  }

  if (!value.startsWith("http")) {
    return getStoragePublicUrl(value);
  }

  const bucketPath = value.match(
    new RegExp(`${STORAGE_BUCKET}/([^?]+)`)
  )?.[1];

  if (bucketPath && baseUrl) {
    return getStoragePublicUrl(decodeURIComponent(bucketPath));
  }

  if (baseUrl && value.startsWith(baseUrl) && !value.includes("/object/public/")) {
    const objectPath = value.match(/object\/(?:sign\/)?([^?]+)/)?.[1];

    if (objectPath) {
      const segments = objectPath.split("/");
      const bucketIndex = segments.indexOf(STORAGE_BUCKET);

      if (bucketIndex >= 0) {
        return getStoragePublicUrl(segments.slice(bucketIndex + 1).join("/"));
      }
    }
  }

  return value;
}
