import { getSession } from "@/lib/auth";
import {
  createSupabaseServerClient,
  isSupabaseStorageConfigured,
  STORAGE_BUCKET
} from "@/lib/supabase";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm"
];

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase Storage가 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY와 Storage 버킷(exhibit-media)을 확인하세요."
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = (formData.get("folder") as string) ?? "uploads";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "jpg, png, webp, mp4, webm 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 20MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const extension = file.name.split(".").pop() ?? "bin";
    const path = `${folder}/${session.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600"
    });

    if (error) {
      return NextResponse.json(
        { error: `업로드 실패: ${error.message}` },
        { status: 500 }
      );
    }

    const { getStoragePublicUrl } = await import("@/lib/storage-url");
    const url = getStoragePublicUrl(path);

    return NextResponse.json({ url, path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "업로드 중 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
