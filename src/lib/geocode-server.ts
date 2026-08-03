type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  provider: "kakao" | "google";
};

export async function geocodeAddressServer(
  address: string
): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (trimmed.length < 4) {
    return null;
  }

  const kakao = await geocodeWithKakao(trimmed);
  if (kakao) {
    return kakao;
  }

  return geocodeWithGoogle(trimmed);
}

async function geocodeWithKakao(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
    {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    documents?: Array<{ x: string; y: string; address_name?: string }>;
  };
  const first = data.documents?.[0];
  if (!first) {
    return null;
  }

  return {
    lat: Number(first.y),
    lng: Number(first.x),
    formattedAddress: first.address_name ?? address,
    provider: "kakao"
  };
}

async function geocodeWithGoogle(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=ko`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  };
  const first = data.results?.[0];
  const location = first?.geometry?.location;
  if (!location) {
    return null;
  }

  return {
    lat: location.lat,
    lng: location.lng,
    formattedAddress: first.formatted_address ?? address,
    provider: "google"
  };
}
