const SOURCE_MAP: Record<string, string> = {
  airbnb: "airbnb",
  airbnb2: "airbnb",
  Airbnb: "airbnb",
  AIRBNB: "airbnb",
  vrbo: "vrbo",
  VRBO: "vrbo",
  homeaway: "vrbo",
  HomeAway: "vrbo",
  HOMEAWAY: "vrbo",
  "booking.com": "booking",
  "Booking.com": "booking",
  bookingcom: "booking",
  booking: "booking",
  expedia: "expedia",
  Expedia: "expedia",
  direct: "direct",
  Direct: "direct",
  manual: "direct",
  Manual: "direct",
  website: "direct",
  Website: "direct",
  tripadvisor: "tripadvisor",
  TripAdvisor: "tripadvisor",
  google: "google",
  Google: "google",
};

const unknownSources = new Set<string>();

export function normalizeSource(rawSource?: string): string {
  if (!rawSource) return "unknown";
  const mapped = SOURCE_MAP[rawSource] ?? SOURCE_MAP[rawSource.toLowerCase()];
  if (mapped) return mapped;
  if (!unknownSources.has(rawSource)) {
    unknownSources.add(rawSource);
    console.warn(`Unknown booking source encountered: ${rawSource}`);
  }
  return rawSource.toLowerCase();
}
