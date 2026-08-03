import { NextResponse } from "next/server";
import { z } from "zod";

const geocodeSchema = z.object({
  address: z.string().min(5)
});

type KakaoGeocodeResponse = {
  documents?: Array<{
    x: string;
    y: string;
    address_name?: string;
  }>;
};

type GoogleGeocodeResponse = {
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  }>;
};

type GeocodeProviderError = {
  provider: "kakao" | "google";
  status: number;
  message: string;
};

async function geocodeWithKakao(address: string) {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    let message = "카카오 주소 좌표 변환에 실패했습니다.";

    try {
      const errorBody = (await response.json()) as {
        message?: string;
        errorType?: string;
      };

      if (response.status === 401) {
        message =
          "카카오 REST API 키가 올바르지 않습니다. 카카오 개발자 콘솔의 REST API 키를 확인하세요.";
      } else if (response.status === 403) {
        message =
          "카카오 Local API가 비활성화되어 있습니다. 카카오 개발자 콘솔 → 내 애플리케이션 → 제품 설정 → 카카오맵/로컬 → 사용 설정을 ON으로 변경하세요.";
      } else if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // ignore JSON parse errors
    }

    const error: GeocodeProviderError = {
      provider: "kakao",
      status: response.status,
      message
    };
    throw error;
  }

  const data = (await response.json()) as KakaoGeocodeResponse;
  const first = data.documents?.[0];

  if (!first) {
    return null;
  }

  return {
    lat: Number(first.y),
    lng: Number(first.x),
    provider: "kakao",
    formattedAddress: first.address_name ?? address
  };
}

async function geocodeWithGoogle(address: string) {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=ko`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Google 주소 좌표 변환에 실패했습니다.");
  }

  const data = (await response.json()) as GoogleGeocodeResponse;
  const first = data.results?.[0];
  const location = first?.geometry?.location;

  if (!location) {
    return null;
  }

  return {
    lat: location.lat,
    lng: location.lng,
    provider: "google",
    formattedAddress: first.formatted_address ?? address
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = geocodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "좌표 변환할 주소를 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const { address } = parsed.data;
    const result =
      (await geocodeWithKakao(address)) ?? (await geocodeWithGoogle(address));

    if (!result) {
      return NextResponse.json(
        {
          error:
            "주소 좌표를 찾지 못했습니다. KAKAO_REST_API_KEY 또는 GOOGLE_GEOCODING_API_KEY 설정을 확인하세요."
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "provider" in error &&
      "message" in error
    ) {
      const providerError = error as GeocodeProviderError;
      return NextResponse.json(
        { error: providerError.message, provider: providerError.provider },
        { status: providerError.status === 404 ? 404 : 502 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "주소 좌표 변환 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
