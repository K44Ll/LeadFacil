export function normalizeHttpUrl(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function comparableDomain(value: string | null | undefined) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;
  return new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
}

export function googleMapsSearchUrl(input: {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const query = [input.name, input.address].filter(Boolean).join(" ").trim();
  const fallback =
    input.latitude !== null &&
    input.latitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== undefined
      ? `${input.latitude},${input.longitude}`
      : input.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || fallback)}`;
}
