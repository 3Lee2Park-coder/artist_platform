/** Haversine distance in meters */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatWalkDistance(meters: number): string {
  if (meters < 80) return "도보 1분";
  const minutes = Math.max(1, Math.round(meters / 80));
  if (minutes <= 2) return `도보 ${minutes}분`;
  if (minutes <= 15) return `도보 ${minutes}분`;
  return `약 ${Math.round(meters / 100) / 10}km`;
}
